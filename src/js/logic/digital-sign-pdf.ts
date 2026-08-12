import { PdfSigner, type SignOption } from 'zgapdfsigner';
import forge from 'node-forge';
import { CertificateData, SignPdfOptions } from '@/types';

export function parsePfxFile(
  pfxBytes: ArrayBuffer,
  password: string
): CertificateData {
  const pfxAsn1 = forge.asn1.fromDer(
    forge.util.createBuffer(new Uint8Array(pfxBytes))
  );
  const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

  const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

  const certBagArray = certBags[forge.pki.oids.certBag];
  const keyBagArray = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

  if (!certBagArray || certBagArray.length === 0) {
    throw new Error('PFX 文件中未找到证书');
  }

  if (!keyBagArray || keyBagArray.length === 0) {
    throw new Error('PFX 文件中未找到私钥');
  }

  const certificate = certBagArray[0].cert;

  if (!certificate) {
    throw new Error('无法从 PFX 文件中提取证书');
  }

  return { p12Buffer: pfxBytes, password, certificate };
}

export function parsePemFiles(
  certPem: string,
  keyPem: string,
  keyPassword?: string
): CertificateData {
  const certificate = forge.pki.certificateFromPem(certPem);

  let privateKey: forge.pki.PrivateKey;
  if (keyPem.includes('ENCRYPTED')) {
    if (!keyPassword) {
      throw new Error('加密私钥需要密码');
    }
    privateKey = forge.pki.decryptRsaPrivateKey(keyPem, keyPassword);
    if (!privateKey) {
      throw new Error('私钥解密失败');
    }
  } else {
    privateKey = forge.pki.privateKeyFromPem(keyPem);
  }

  const p12Password = keyPassword || crypto.randomUUID();
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    privateKey,
    [certificate],
    p12Password,
    { algorithm: '3des' }
  );
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Buffer = new Uint8Array(p12Der.length);
  for (let i = 0; i < p12Der.length; i++) {
    p12Buffer[i] = p12Der.charCodeAt(i);
  }

  return { p12Buffer: p12Buffer.buffer, password: p12Password, certificate };
}

export function parseCombinedPem(
  pemContent: string,
  password?: string
): CertificateData {
  const certMatch = pemContent.match(
    /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/
  );
  const keyMatch = pemContent.match(
    /-----BEGIN (RSA |EC |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC |ENCRYPTED )?PRIVATE KEY-----/
  );

  if (!certMatch) {
    throw new Error('PEM 文件中未找到证书');
  }

  if (!keyMatch) {
    throw new Error('PEM 文件中未找到私钥');
  }

  return parsePemFiles(certMatch[0], keyMatch[0], password);
}

export async function signPdf(
  pdfBytes: Uint8Array,
  certificateData: CertificateData,
  options: SignPdfOptions = {}
): Promise<Uint8Array> {
  const signatureInfo = options.signatureInfo ?? {};

  const signOptions: SignOption = {
    p12cert: certificateData.p12Buffer,
    pwd: certificateData.password,
  };

  if (signatureInfo.reason) {
    signOptions.reason = signatureInfo.reason;
  }

  if (signatureInfo.location) {
    signOptions.location = signatureInfo.location;
  }

  if (signatureInfo.contactInfo) {
    signOptions.contact = signatureInfo.contactInfo;
  }

  if (options.visibleSignature?.enabled) {
    const vs = options.visibleSignature;

    const drawinf = {
      area: {
        x: vs.x,
        y: vs.y,
        w: vs.width,
        h: vs.height,
      },
      pageidx: vs.page,
      imgInfo: undefined as
        | { imgData: ArrayBuffer; imgType: string }
        | undefined,
      textInfo: undefined as
        | { text: string; size: number; color: string }
        | undefined,
    };

    if (vs.imageData && vs.imageType) {
      drawinf.imgInfo = {
        imgData: vs.imageData,
        imgType: vs.imageType,
      };
    }

    if (vs.text) {
      drawinf.textInfo = {
        text: vs.text,
        size: vs.textSize ?? 12,
        color: vs.textColor ?? '#000000',
      };
    }

    signOptions.drawinf = drawinf as SignOption['drawinf'];
  }

  const signedPdfBytes = await new PdfSigner(signOptions).sign(pdfBytes);
  return new Uint8Array(signedPdfBytes);
}

export function getCertificateInfo(certificate: forge.pki.Certificate): {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
} {
  const subjectCN = certificate.subject.getField('CN');
  const issuerCN = certificate.issuer.getField('CN');

  return {
    subject: (subjectCN?.value as string) ?? 'Unknown',
    issuer: (issuerCN?.value as string) ?? 'Unknown',
    validFrom: certificate.validity.notBefore,
    validTo: certificate.validity.notAfter,
    serialNumber: certificate.serialNumber,
  };
}
