import { createIcons, icons } from 'lucide';
import { t } from '../i18n/i18n';
import i18next from 'i18next';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
import { showAlert, showLoader, hideLoader } from '../ui.js';
import { readFileAsArrayBuffer, formatBytes } from '../utils/helpers.js';
import { validatePdfSignatures } from './validate-signature-pdf.js';
import forge from 'node-forge';
import { SignatureValidationResult, ValidateSignatureState } from '@/types';

const state: ValidateSignatureState = {
  pdfFile: null,
  pdfBytes: null,
  results: [],
  trustedCertFile: null,
  trustedCert: null,
};

function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function resetState(): void {
  state.pdfFile = null;
  state.pdfBytes = null;
  state.results = [];

  const fileDisplayArea = getElement<HTMLDivElement>('file-display-area');
  if (fileDisplayArea) fileDisplayArea.innerHTML = '';

  const resultsSection = getElement<HTMLDivElement>('results-section');
  if (resultsSection) resultsSection.classList.add('hidden');

  const resultsContainer = getElement<HTMLDivElement>('results-container');
  if (resultsContainer) resultsContainer.innerHTML = '';

  const fileInput = getElement<HTMLInputElement>('file-input');
  if (fileInput) fileInput.value = '';

  const customCertSection = getElement<HTMLDivElement>('custom-cert-section');
  if (customCertSection) customCertSection.classList.add('hidden');
}

function resetCertState(): void {
  state.trustedCertFile = null;
  state.trustedCert = null;

  const certDisplayArea = getElement<HTMLDivElement>('cert-display-area');
  if (certDisplayArea) certDisplayArea.innerHTML = '';

  const certInput = getElement<HTMLInputElement>('cert-input');
  if (certInput) certInput.value = '';
}

function initializePage(): void {
  createIcons({ icons });

  const fileInput = getElement<HTMLInputElement>('file-input');
  const dropZone = getElement<HTMLDivElement>('drop-zone');
  const certInput = getElement<HTMLInputElement>('cert-input');
  const certDropZone = getElement<HTMLDivElement>('cert-drop-zone');

  if (fileInput) {
    fileInput.addEventListener('change', handlePdfUpload);
    fileInput.addEventListener('click', () => {
      fileInput.value = '';
    });
  }

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('ui-bg-raised');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('ui-bg-raised');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('ui-bg-raised');
      const droppedFiles = e.dataTransfer?.files;
      if (droppedFiles && droppedFiles.length > 0) {
        handlePdfFile(droppedFiles[0]);
      }
    });
  }

  if (certInput) {
    certInput.addEventListener('change', handleCertUpload);
    certInput.addEventListener('click', () => {
      certInput.value = '';
    });
  }

  if (certDropZone) {
    certDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      certDropZone.classList.add('ui-bg-raised');
    });

    certDropZone.addEventListener('dragleave', () => {
      certDropZone.classList.remove('ui-bg-raised');
    });

    certDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      certDropZone.classList.remove('ui-bg-raised');
      const droppedFiles = e.dataTransfer?.files;
      if (droppedFiles && droppedFiles.length > 0) {
        handleCertFile(droppedFiles[0]);
      }
    });
  }
}

function handlePdfUpload(e: Event): void {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    handlePdfFile(input.files[0]);
  }
}

async function handlePdfFile(file: File): Promise<void> {
  if (
    file.type !== 'application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    showAlert(
      translate('alert.invalidFile', 'Invalid File'),
      translate(
        'tools:validateSignaturePdf.dynamic.ce9a858d22',
        'Please select a PDF file.'
      )
    );
    return;
  }

  resetState();
  state.pdfFile = file;
  state.pdfBytes = new Uint8Array(
    (await readFileAsArrayBuffer(file)) as ArrayBuffer
  );

  updatePdfDisplay();

  const customCertSection = getElement<HTMLDivElement>('custom-cert-section');
  if (customCertSection) customCertSection.classList.remove('hidden');
  createIcons({ icons });

  await validateSignatures();
}

function updatePdfDisplay(): void {
  const fileDisplayArea = getElement<HTMLDivElement>('file-display-area');
  if (!fileDisplayArea || !state.pdfFile) return;

  fileDisplayArea.innerHTML = '';

  const fileDiv = document.createElement('div');
  fileDiv.className =
    'flex items-center justify-between ui-bg-raised p-3 rounded-lg';

  const infoContainer = document.createElement('div');
  infoContainer.className = 'flex flex-col flex-1 min-w-0';

  const nameSpan = document.createElement('div');
  nameSpan.className = 'truncate font-medium ui-text-primary text-sm mb-1';
  nameSpan.textContent = state.pdfFile.name;

  const metaSpan = document.createElement('div');
  metaSpan.className = 'text-xs ui-text-secondary';
  metaSpan.textContent = formatBytes(state.pdfFile.size);

  infoContainer.append(nameSpan, metaSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className =
    'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
  removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
  removeBtn.onclick = () => resetState();

  fileDiv.append(infoContainer, removeBtn);
  fileDisplayArea.appendChild(fileDiv);
  createIcons({ icons });
}

function handleCertUpload(e: Event): void {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    handleCertFile(input.files[0]);
  }
}

async function handleCertFile(file: File): Promise<void> {
  const validExtensions = ['.pem', '.crt', '.cer', '.der'];
  const hasValidExtension = validExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    showAlert(
      translate(
        'tools:validateSignaturePdf.dynamic.4cff9de413',
        'Invalid Certificate'
      ),
      translate(
        'tools:validateSignaturePdf.dynamic.934e0a255a',
        'Please select a .pem, .crt, .cer, or .der certificate file.'
      )
    );
    return;
  }

  resetCertState();
  state.trustedCertFile = file;

  try {
    const content = await file.text();

    if (content.includes('-----BEGIN CERTIFICATE-----')) {
      state.trustedCert = forge.pki.certificateFromPem(content);
    } else {
      const bytes = new Uint8Array(
        (await readFileAsArrayBuffer(file)) as ArrayBuffer
      );
      const derString = String.fromCharCode.apply(null, Array.from(bytes));
      const asn1 = forge.asn1.fromDer(derString);
      state.trustedCert = forge.pki.certificateFromAsn1(asn1);
    }

    updateCertDisplay();

    if (state.pdfBytes) {
      await validateSignatures();
    }
  } catch (error) {
    console.error('Error parsing certificate:', error);
    showAlert(
      translate(
        'tools:validateSignaturePdf.dynamic.4cff9de413',
        'Invalid Certificate'
      ),
      translate(
        'tools:validateSignaturePdf.dynamic.dfa18c01c2',
        'Failed to parse the certificate file.'
      )
    );
    resetCertState();
  }
}

function updateCertDisplay(): void {
  const certDisplayArea = getElement<HTMLDivElement>('cert-display-area');
  if (!certDisplayArea || !state.trustedCertFile || !state.trustedCert) return;

  certDisplayArea.innerHTML = '';

  const certDiv = document.createElement('div');
  certDiv.className =
    'flex items-center justify-between ui-bg-raised p-3 rounded-lg';

  const infoContainer = document.createElement('div');
  infoContainer.className = 'flex flex-col flex-1 min-w-0';

  const nameSpan = document.createElement('div');
  nameSpan.className = 'truncate font-medium ui-text-primary text-sm mb-1';

  const cn = state.trustedCert.subject.getField('CN');
  nameSpan.textContent = (cn?.value as string) || state.trustedCertFile.name;

  const metaSpan = document.createElement('div');
  metaSpan.className = 'text-xs ui-text-success';
  metaSpan.innerHTML =
    '<i data-lucide="check-circle" class="inline w-3 h-3 mr-1"></i>Trusted certificate loaded';

  infoContainer.append(nameSpan, metaSpan);

  const removeBtn = document.createElement('button');
  removeBtn.className =
    'ml-4 ui-text-danger ui-hover-text-danger flex-shrink-0';
  removeBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>';
  removeBtn.onclick = async () => {
    resetCertState();
    if (state.pdfBytes) {
      await validateSignatures();
    }
  };

  certDiv.append(infoContainer, removeBtn);
  certDisplayArea.appendChild(certDiv);
  createIcons({ icons });
}

async function validateSignatures(): Promise<void> {
  if (!state.pdfBytes) return;

  showLoader(
    translate(
      'tools:validateSignaturePdf.dynamic.2f59e87d76',
      'Analyzing signatures...'
    )
  );

  try {
    state.results = await validatePdfSignatures(
      state.pdfBytes,
      state.trustedCert ?? undefined
    );
    displayResults();
  } catch (error) {
    console.error('Validation error:', error);
    showAlert(
      translate('alert.error', 'Error'),
      translate(
        'tools:validateSignaturePdf.dynamic.5ae8ade49f',
        'Failed to validate signatures. The file may be corrupted.'
      )
    );
  } finally {
    hideLoader();
  }
}

function displayResults(): void {
  const resultsSection = getElement<HTMLDivElement>('results-section');
  const resultsContainer = getElement<HTMLDivElement>('results-container');

  if (!resultsSection || !resultsContainer) return;

  resultsContainer.innerHTML = '';
  resultsSection.classList.remove('hidden');

  if (state.results.length === 0) {
    resultsContainer.innerHTML = `
            <div class="ui-bg-raised rounded-lg p-6 text-center border ui-border">
                <i data-lucide="file-x" class="w-12 h-12 mx-auto mb-4 ui-text-secondary"></i>
                <h3 class="text-lg font-semibold ui-text-primary mb-2">${translate('validateSignature.noSignatures', 'No Signatures Found')}</h3>
                <p class="ui-text-secondary">${translate('validateSignature.noSignaturesDesc', 'This PDF does not contain any digital signatures.')}</p>
            </div>
        `;
    createIcons({ icons });
    return;
  }

  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'mb-4 p-3 ui-bg-raised rounded-lg border ui-border';

  const validCount = state.results.filter(
    (r) => r.isValid && !r.isExpired && r.isTrusted
  ).length;
  const trustVerified = state.trustedCert
    ? state.results.filter((r) => r.isTrusted).length
    : 0;

  const sigFoundText = translate(
    'validateSignature.signaturesFound',
    `${state.results.length} signature${state.results.length > 1 ? 's' : ''} found`,
    { count: state.results.length }
  );
  const validLabel = translate('validateSignature.valid', 'valid');

  let summaryHtml = `
        <p class="ui-text-secondary">
            ${sigFoundText}
            <span class="ui-text-tertiary">•</span>
            <span class="${validCount === state.results.length ? 'ui-text-success' : 'ui-text-warning'}">${validCount} ${validLabel}</span>
        </p>
    `;

  if (state.trustedCert) {
    summaryHtml += `
            <p class="text-xs ui-text-secondary mt-1">
                <i data-lucide="shield-check" class="inline w-3 h-3 mr-1"></i>
                ${translate(
                  'validateSignature.trustVerification',
                  `Trust verification: ${trustVerified}/${state.results.length} signatures verified against custom certificate`,
                  { trusted: trustVerified, total: state.results.length }
                )}
            </p>
        `;
  }

  summaryDiv.innerHTML = summaryHtml;
  resultsContainer.appendChild(summaryDiv);

  state.results.forEach((result, index) => {
    const card = createSignatureCard(result, index);
    resultsContainer.appendChild(card);
  });

  createIcons({ icons });
}

function createSignatureCard(
  result: SignatureValidationResult,
  index: number
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'ui-bg-raised rounded-lg p-4 border ui-border mb-4';

  let statusColor = 'ui-text-success';
  let statusIcon = 'check-circle';
  let statusText = translate(
    'validateSignature.status.valid',
    'Valid Signature'
  );

  if (!result.isValid) {
    if (result.cryptoVerificationStatus === 'unsupported') {
      statusColor = 'ui-text-warning';
      statusIcon = 'alert-triangle';
      statusText = translate(
        'validateSignature.status.unsupportedAlgorithm',
        'Unverified — Unsupported Signature Algorithm'
      );
    } else if (
      result.cryptoVerified === true &&
      result.coverageStatus === 'partial'
    ) {
      statusColor = 'ui-text-danger';
      statusIcon = 'x-circle';
      statusText = translate(
        'validateSignature.status.modifiedAfterSigning',
        'Invalid — Modified After Signing (partial coverage)'
      );
    } else {
      statusColor = 'ui-text-danger';
      statusIcon = 'x-circle';
      statusText =
        result.cryptoVerified === false
          ? translate(
              'validateSignature.status.cryptoFailed',
              'Invalid — Cryptographic Verification Failed'
            )
          : translate('validateSignature.status.invalid', 'Invalid Signature');
    }
  } else if (result.usesInsecureDigest) {
    statusColor = 'ui-text-danger';
    statusIcon = 'x-circle';
    statusText = translate(
      'validateSignature.status.insecureDigest',
      'Insecure Digest (MD5 / SHA-1)'
    );
  } else if (result.isExpired) {
    statusColor = 'ui-text-warning';
    statusIcon = 'alert-triangle';
    statusText = translate(
      'validateSignature.status.certExpired',
      'Certificate Expired'
    );
  } else if (!result.isTrusted) {
    statusColor = 'ui-text-warning';
    statusIcon = 'alert-triangle';
    statusText = result.isSelfSigned
      ? translate(
          'validateSignature.status.selfSigned',
          'Self-Signed — Signer Identity Not Verified'
        )
      : translate(
          'validateSignature.status.signatureIntact',
          'Signature Intact — Signer Identity Not Verified'
        );
  }

  const formatDate = (date: Date) => {
    if (!date || date.getTime() === 0)
      return translate('validateSignature.unknown', 'Unknown');
    return date.toLocaleDateString(
      i18next.resolvedLanguage || i18next.language,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  const trustedLabel = translate('validateSignature.trusted', 'Trusted');
  const notTrustedLabel = translate(
    'validateSignature.notInTrustChain',
    'Not in trust chain'
  );

  let trustBadge = '';
  if (state.trustedCert) {
    if (result.isTrusted) {
      trustBadge = `<span class="text-xs ui-bg-success ui-text-success px-2 py-1 rounded ml-2"><i data-lucide="shield-check" class="inline w-3 h-3 mr-1"></i>${trustedLabel}</span>`;
    } else {
      trustBadge = `<span class="text-xs ui-bg-raised ui-text-secondary px-2 py-1 rounded ml-2"><i data-lucide="shield-x" class="inline w-3 h-3 mr-1"></i>${notTrustedLabel}</span>`;
    }
  }

  const signatureLabel = translate(
    'validateSignature.signatureNumber',
    'Signature {{index}}',
    { index: index + 1 }
  );
  const fullCovLabel = translate(
    'validateSignature.fullCoverage',
    'Full Coverage'
  );
  const partialCovLabel = translate(
    'validateSignature.partialCoverage',
    'Partial Coverage'
  );
  const signedByLabel = translate('validateSignature.signedBy', 'Signed By');
  const issuerLabel = translate('validateSignature.issuer', 'Issuer');
  const signedOnLabel = translate('validateSignature.signedOn', 'Signed On');
  const validFromLabel = translate('validateSignature.validFrom', 'Valid From');
  const validUntilLabel = translate(
    'validateSignature.validUntil',
    'Valid Until'
  );
  const reasonLabel = translate('validateSignature.reason', 'Reason');
  const locationLabel = translate('validateSignature.location', 'Location');
  const techDetailsLabel = translate(
    'validateSignature.technicalDetails',
    'Technical Details'
  );
  const serialNumLabel = translate(
    'validateSignature.serialNumber',
    'Serial Number'
  );
  const digestAlgLabel = translate(
    'validateSignature.digestAlgorithm',
    'Digest Algorithm'
  );
  const sigAlgLabel = translate(
    'validateSignature.signatureAlgorithm',
    'Signature Algorithm'
  );
  const errorLabel = translate('validateSignature.error', 'Error');

  let coverageBadge = '';
  if (result.coverageStatus === 'full') {
    coverageBadge = `<span class="text-xs ui-bg-success ui-text-success px-2 py-1 rounded">${fullCovLabel}</span>`;
  } else if (result.coverageStatus === 'partial') {
    coverageBadge = `<span class="text-xs ui-bg-warning ui-text-warning px-2 py-1 rounded">${partialCovLabel}</span>`;
  }

  card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
                <i data-lucide="${statusIcon}" class="w-6 h-6 ${statusColor}"></i>
                <div>
                    <h3 class="font-semibold ui-text-primary">${signatureLabel}</h3>
                    <p class="text-sm ${statusColor}">${statusText}</p>
                </div>
            </div>
            <div class="flex items-center">
                ${coverageBadge}${trustBadge}
            </div>
        </div>

        <div class="space-y-3 text-sm">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p class="ui-text-secondary">${signedByLabel}</p>
                    <p class="ui-text-primary font-medium">${escapeHtml(result.signerName)}</p>
                    ${result.signerOrg ? `<p class="ui-text-secondary text-xs">${escapeHtml(result.signerOrg)}</p>` : ''}
                    ${result.signerEmail ? `<p class="ui-text-secondary text-xs">${escapeHtml(result.signerEmail)}</p>` : ''}
                </div>
                <div>
                    <p class="ui-text-secondary">${issuerLabel}</p>
                    <p class="ui-text-primary font-medium">${escapeHtml(result.issuer)}</p>
                    ${result.issuerOrg ? `<p class="ui-text-secondary text-xs">${escapeHtml(result.issuerOrg)}</p>` : ''}
                </div>
            </div>

            ${
              result.signatureDate
                ? `
                <div>
                    <p class="ui-text-secondary">${signedOnLabel}</p>
                    <p class="ui-text-primary">${formatDate(result.signatureDate)}</p>
                </div>
            `
                : ''
            }

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p class="ui-text-secondary">${validFromLabel}</p>
                    <p class="ui-text-primary">${formatDate(result.validFrom)}</p>
                </div>
                <div>
                    <p class="ui-text-secondary">${validUntilLabel}</p>
                    <p class="${result.isExpired ? 'ui-text-danger' : 'ui-text-primary'}">${formatDate(result.validTo)}</p>
                </div>
            </div>

            ${
              result.reason
                ? `
                <div>
                    <p class="ui-text-secondary">${reasonLabel}</p>
                    <p class="ui-text-primary">${escapeHtml(result.reason)}</p>
                </div>
            `
                : ''
            }

            ${
              result.location
                ? `
                <div>
                    <p class="ui-text-secondary">${locationLabel}</p>
                    <p class="ui-text-primary">${escapeHtml(result.location)}</p>
                </div>
            `
                : ''
            }

            <details class="mt-2">
                <summary class="cursor-pointer ui-text-action ui-hover-text-action text-sm">
                    ${techDetailsLabel}
                </summary>
                <div class="mt-2 p-3 ui-bg-surface rounded text-xs space-y-1">
                    <p><span class="ui-text-secondary">${serialNumLabel}:</span> <span class="ui-text-secondary font-mono">${escapeHtml(result.serialNumber)}</span></p>
                    <p><span class="ui-text-secondary">${digestAlgLabel}:</span> <span class="ui-text-secondary">${escapeHtml(result.algorithms.digest)}</span></p>
                    <p><span class="ui-text-secondary">${sigAlgLabel}:</span> <span class="ui-text-secondary">${escapeHtml(result.algorithms.signature)}</span></p>
                    ${result.errorMessage ? `<p class="ui-text-danger">${errorLabel}: ${escapeHtml(result.errorMessage)}</p>` : ''}
                    ${result.unsupportedAlgorithmReason ? `<p class="ui-text-warning">${escapeHtml(result.unsupportedAlgorithmReason)}</p>` : ''}
                </div>
            </details>
        </div>
    `;

  return card;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}
