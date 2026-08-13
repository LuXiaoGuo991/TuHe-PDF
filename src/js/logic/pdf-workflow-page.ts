import { showAlert } from '@/js/ui.js';
import { t } from '../i18n/i18n';

const translate = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>
) => {
  const translation = t(key, options);
  return translation && translation !== key ? translation : fallback;
};
import { createWorkflowEditor, updateNodeDisplay } from '@/js/workflow/editor';
import type { WorkflowEditor } from '@/js/workflow/editor';
import { executeWorkflow } from '@/js/workflow/engine';
import { translateCategory, translateNodeLabel } from '@/js/workflow/i18n';
import type { NodeCategory } from '@/js/workflow/types';
import {
  type BaseWorkflowNode,
  nodeRegistry,
  getNodesByCategory,
  createNodeByType,
  PDFInputNode,
  EncryptedPDFError,
  ImageInputNode,
  WordToPdfNode,
  ExcelToPdfNode,
  PowerPointToPdfNode,
  TextToPdfNode,
  SvgToPdfNode,
  EpubToPdfNode,
  EmailToPdfNode,
  DigitalSignNode,
  XpsToPdfNode,
  MobiToPdfNode,
  Fb2ToPdfNode,
  CbzToPdfNode,
  MarkdownToPdfNode,
  JsonToPdfNode,
  XmlToPdfNode,
  WpdToPdfNode,
  WpsToPdfNode,
  PagesToPdfNode,
  OdgToPdfNode,
  PubToPdfNode,
  VsdToPdfNode,
} from '@/js/workflow/nodes';
import {
  saveWorkflow,
  loadWorkflow,
  exportWorkflow,
  importWorkflow,
  getSavedTemplateNames,
  templateNameExists,
  deleteTemplate,
} from '@/js/workflow/serialization';
import { getAvailableTesseractLanguageEntries } from '@/js/utils/tesseract-language-availability.js';
import { isToolDisabled } from '@/js/utils/disabled-tools.js';
import { IMAGE_ACCEPT } from '@/js/utils/image-input-utils.js';

let workflowEditor: WorkflowEditor | null = null;
let selectedNodeId: string | null = null;
let deleteNodeHandler: EventListener | null = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

async function initializePage() {
  const container = document.getElementById('rete-container');
  if (!container) return;

  workflowEditor = await createWorkflowEditor(container);
  const { editor, area, engine } = workflowEditor;

  buildToolbox();

  editor.addPipe((context) => {
    if (context.type === 'nodecreated' || context.type === 'noderemoved') {
      updateNodeCount();
    }
    if (
      context.type === 'connectioncreated' ||
      context.type === 'connectionremoved'
    ) {
      const conn = context.data;
      updateNodeDisplay(conn.source, editor, area);
      updateNodeDisplay(conn.target, editor, area);
    }
    return context;
  });

  document.getElementById('run-btn')?.addEventListener('click', async () => {
    const allNodes = editor.getNodes() as BaseWorkflowNode[];
    if (allNodes.length === 0) {
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'common.dynamic.c73d89e248',
          'Add at least one node to run the workflow.'
        )
      );
      return;
    }
    const hasInput = allNodes.some((n) => n.category === 'Input');
    const hasOutput = allNodes.some((n) => n.category === 'Output');
    if (!hasInput || !hasOutput) {
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'common.dynamic.17165fa279',
          'Your workflow needs at least one input node and one output node to run.'
        )
      );
      return;
    }

    const statusText = document.getElementById('status-text');
    const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
    runBtn.disabled = true;
    runBtn.classList.add('opacity-50', 'pointer-events-none');

    try {
      await executeWorkflow(editor, engine, area, (progress) => {
        const msg =
          progress.message ||
          translate(
            'tools:pdfWorkflow.processingNode',
            `Processing ${progress.nodeName}...`,
            { value0: progress.nodeName }
          );
        if (statusText) statusText.textContent = msg;
      });
      if (statusText)
        statusText.textContent = translate(
          'common.dynamic.9da02eb759',
          'Workflow completed'
        );
    } catch (err) {
      console.error('[PdfWorkflow] Execution failed:', err);
      if (statusText)
        statusText.textContent = translate(
          'tools:pdfWorkflow.errorDuringExecution',
          'Error during execution'
        );
      showAlert(
        translate('alert.error', 'Error'),
        translate(
          'tools:pdfWorkflow.executionFailed',
          'Workflow execution failed. Please try again.'
        )
      );
    } finally {
      runBtn.disabled = false;
      runBtn.classList.remove('opacity-50', 'pointer-events-none');
    }
  });

  document.getElementById('clear-btn')?.addEventListener('click', async () => {
    await editor.clear();
    updateNodeCount();
    const statusText = document.getElementById('status-text');
    if (statusText)
      statusText.textContent = translate('common.dynamic.537ba3aa0a', 'Ready');
    document.getElementById('settings-sidebar')?.classList.add('hidden');
  });

  document.getElementById('close-settings')?.addEventListener('click', () => {
    document.getElementById('settings-sidebar')?.classList.add('hidden');
  });

  document.getElementById('save-btn')?.addEventListener('click', () => {
    showSaveTemplateModal(editor, area);
  });

  document.getElementById('load-btn')?.addEventListener('click', () => {
    showLoadTemplateModal(editor, area);
  });

  document.getElementById('export-btn')?.addEventListener('click', () => {
    exportWorkflow(editor, area);
  });

  document.getElementById('import-btn')?.addEventListener('click', async () => {
    await importWorkflow(editor, area);
    updateNodeCount();
  });

  // Mobile toolbox sidebar toggle
  const toolboxSidebar = document.getElementById('toolbox-sidebar');
  const toolboxBackdrop = document.getElementById('toolbox-backdrop');

  function closeToolbox() {
    toolboxSidebar?.classList.add('hidden');
    toolboxSidebar?.classList.remove('flex');
    toolboxBackdrop?.classList.add('hidden');
  }

  function openToolbox() {
    toolboxSidebar?.classList.remove('hidden');
    toolboxSidebar?.classList.add('flex');
    toolboxBackdrop?.classList.remove('hidden');
  }

  document.getElementById('toolbox-toggle')?.addEventListener('click', () => {
    if (toolboxSidebar?.classList.contains('hidden')) {
      openToolbox();
    } else {
      closeToolbox();
    }
  });

  toolboxBackdrop?.addEventListener('click', closeToolbox);

  document.getElementById('node-search')?.addEventListener('input', (e) => {
    if ((e as any).isComposing) return;
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    const items = document.querySelectorAll<HTMLElement>('.toolbox-node-item');
    const categories =
      document.querySelectorAll<HTMLElement>('.toolbox-category');

    items.forEach((item) => {
      const label = item.dataset.label?.toLowerCase() ?? '';
      item.style.display = label.includes(query) ? '' : 'none';
    });

    categories.forEach((cat) => {
      const itemsContainer = cat.querySelector<HTMLElement>('.toolbox-items');
      if (itemsContainer) itemsContainer.style.display = '';
      const visibleItems = cat.querySelectorAll<HTMLElement>(
        '.toolbox-node-item:not([style*="display: none"])'
      );
      cat.style.display = visibleItems.length > 0 ? '' : 'none';
    });
  });

  let justPicked = false;
  let dragDistance = 0;
  let pickedNodeId: string | null = null;

  area.addPipe((context) => {
    if (context.type === 'nodepicked') {
      const nodeId = context.data.id;
      selectedNodeId = nodeId;
      justPicked = true;
      pickedNodeId = nodeId;
      dragDistance = 0;
    }
    if (context.type === 'nodetranslated') {
      const dx = context.data.position.x - context.data.previous.x;
      const dy = context.data.position.y - context.data.previous.y;
      dragDistance += Math.abs(dx) + Math.abs(dy);
    }
    if (context.type === 'nodedragged') {
      if (pickedNodeId && dragDistance < 5) {
        const node = editor.getNode(pickedNodeId) as BaseWorkflowNode;
        if (node) {
          showNodeSettings(node);
        }
      }
      pickedNodeId = null;
    }
    if (context.type === 'translated') {
      container.classList.add('is-panning');
    }
    return context;
  });

  container.addEventListener('mouseup', () =>
    container.classList.remove('is-panning')
  );
  container.addEventListener('mouseleave', () =>
    container.classList.remove('is-panning')
  );

  container.addEventListener('click', (e) => {
    if (justPicked) {
      justPicked = false;
      return;
    }
    if ((e.target as HTMLElement).closest('[data-testid="node"]')) return;
    selectedNodeId = null;
    document.getElementById('settings-sidebar')?.classList.add('hidden');
  });

  document.addEventListener('keydown', (e) => {
    if (!selectedNodeId || !workflowEditor) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      deleteSelectedNode();
    }
  });

  if (deleteNodeHandler) {
    document.removeEventListener('wf-delete-node', deleteNodeHandler);
  }
  deleteNodeHandler = ((e: CustomEvent) => {
    const nodeId = e.detail?.nodeId;
    if (nodeId) deleteNodeById(nodeId);
  }) as EventListener;
  document.addEventListener('wf-delete-node', deleteNodeHandler);
}

async function deleteNodeById(nodeId: string) {
  if (!workflowEditor) return;
  const { editor } = workflowEditor;

  const conns = editor
    .getConnections()
    .filter((c) => c.source === nodeId || c.target === nodeId);
  for (const conn of conns) {
    await editor.removeConnection(conn.id);
  }
  await editor.removeNode(nodeId);

  if (selectedNodeId === nodeId) {
    selectedNodeId = null;
    document.getElementById('settings-sidebar')?.classList.add('hidden');
  }
  updateNodeCount();
}

async function deleteSelectedNode() {
  if (!selectedNodeId) return;
  await deleteNodeById(selectedNodeId);
}

function updateNodeCount() {
  if (!workflowEditor) return;
  const count = workflowEditor.editor.getNodes().length;
  const el = document.getElementById('node-count');
  if (el)
    el.textContent = translate(
      'common.dynamic.083b5e83a4',
      `${count} node${count !== 1 ? 's' : ''}`,
      { value0: count, value1: count !== 1 ? 's' : '' }
    );
}

function showSaveTemplateModal(
  editor: WorkflowEditor['editor'],
  area: WorkflowEditor['area']
) {
  const modal = document.getElementById('save-template-modal')!;
  const nameInput = document.getElementById(
    'save-template-name'
  ) as HTMLInputElement;
  const errorEl = document.getElementById('save-template-error')!;
  const confirmBtn = document.getElementById('save-template-confirm')!;
  const cancelBtn = document.getElementById('save-template-cancel')!;

  nameInput.value = '';
  errorEl.classList.add('hidden');
  modal.classList.remove('hidden');
  nameInput.focus();

  const cleanup = () => {
    modal.classList.add('hidden');
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    nameInput.removeEventListener('keydown', onKeydown);
  };

  const doSave = () => {
    const name = nameInput.value.trim();
    if (!name) {
      errorEl.textContent = translate(
        'common.dynamic.9181ca520d',
        'Please enter a name.'
      );
      errorEl.classList.remove('hidden');
      return;
    }
    if (templateNameExists(name)) {
      errorEl.textContent = translate(
        'common.dynamic.4db44d4a58',
        'A template with this name already exists.'
      );
      errorEl.classList.remove('hidden');
      return;
    }
    saveWorkflow(editor, area, name);
    cleanup();
    showAlert(
      translate('common.dynamic.be0ce2cc7a', 'Saved'),
      translate('common.dynamic.03e67a394e', `Template "${name}" saved.`, {
        value0: name,
      }),
      'success'
    );
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') doSave();
    if (e.key === 'Escape') cleanup();
  };

  nameInput.addEventListener('keydown', onKeydown);
  document
    .getElementById('save-template-confirm')!
    .addEventListener('click', doSave);
  document
    .getElementById('save-template-cancel')!
    .addEventListener('click', cleanup);
}

function showLoadTemplateModal(
  editor: WorkflowEditor['editor'],
  area: WorkflowEditor['area']
) {
  const modal = document.getElementById('load-template-modal')!;
  const listEl = document.getElementById('load-template-list')!;
  const emptyEl = document.getElementById('load-template-empty')!;
  const cancelBtn = document.getElementById('load-template-cancel')!;

  const names = getSavedTemplateNames();
  listEl.innerHTML = '';

  if (names.length === 0) {
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    for (const name of names) {
      const row = document.createElement('div');
      row.className =
        'group flex items-center gap-2 ui-bg-canvas hover:ui-bg-raised rounded-lg px-3 py-2.5 border ui-border-subtle transition-colors cursor-pointer';

      const icon = document.createElement('i');
      icon.className =
        'ph ph-file-text text-base ui-text-tertiary flex-shrink-0';
      row.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'ui-text-primary text-sm truncate flex-1';
      label.textContent = name;
      row.appendChild(label);

      const loadBtn = document.createElement('button');
      loadBtn.className =
        'ui-bg-action ui-hover-bg-action ui-text-primary text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex-shrink-0';
      loadBtn.textContent = translate('common.dynamic.faec63c70c', 'Load');
      loadBtn.addEventListener('click', async () => {
        const loaded = await loadWorkflow(editor, area, name);
        cleanup();
        if (loaded) {
          updateNodeCount();
          showAlert(
            translate('common.dynamic.3e37f1d2b7', 'Loaded'),
            translate(
              'common.dynamic.b770559d57',
              `Template "${name}" loaded.`,
              { value0: name }
            ),
            'success'
          );
        } else {
          showAlert(
            translate('alert.error', 'Error'),
            translate('common.dynamic.ae55d40de3', 'Failed to load template.')
          );
        }
      });
      row.appendChild(loadBtn);

      const delBtn = document.createElement('button');
      delBtn.className =
        'ui-text-tertiary hover:ui-text-danger transition-colors flex-shrink-0';
      delBtn.innerHTML = '<i class="ph ph-trash text-sm"></i>';
      delBtn.addEventListener('click', () => {
        deleteTemplate(name);
        row.remove();
        const remaining = getSavedTemplateNames();
        if (remaining.length === 0) emptyEl.classList.remove('hidden');
      });
      row.appendChild(delBtn);

      listEl.appendChild(row);
    }
  }

  modal.classList.remove('hidden');

  const cleanup = () => {
    modal.classList.add('hidden');
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  };

  document
    .getElementById('load-template-cancel')!
    .addEventListener('click', cleanup);
}

function buildToolbox() {
  const container = document.getElementById('toolbox-categories');
  if (!container) return;

  const categorized = getNodesByCategory();
  const categoryOrder: Array<{
    key: NodeCategory;
    color: string;
  }> = [
    { key: 'Input', color: 'ui-text-info' },
    { key: 'Edit & Annotate', color: 'ui-text-action' },
    { key: 'Organize & Manage', color: 'text-violet-300' },
    { key: 'Optimize & Repair', color: 'text-amber-300' },
    { key: 'Secure PDF', color: 'text-rose-300' },
    { key: 'Output', color: 'text-teal-300' },
  ];

  for (const cat of categoryOrder) {
    const entries = (categorized[cat.key] ?? []).filter(
      (entry) => !entry.toolPageId || !isToolDisabled(entry.toolPageId)
    );
    if (entries.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'toolbox-category';

    const header = document.createElement('button');
    header.className = `w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider ${cat.color} mb-1.5 px-1 hover:opacity-80 transition-opacity`;
    header.type = 'button';

    const headerLabel = document.createElement('span');
    headerLabel.textContent = translateCategory(cat.key);
    header.appendChild(headerLabel);

    const chevronWrap = document.createElement('span');
    chevronWrap.className = 'flex-shrink-0';
    chevronWrap.innerHTML = '<i class="ph ph-caret-down text-xs"></i>';
    header.appendChild(chevronWrap);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'toolbox-items';

    header.addEventListener('click', () => {
      const collapsed = itemsContainer.style.display === 'none';
      itemsContainer.style.display = collapsed ? '' : 'none';
      const iconName = collapsed ? 'ph-caret-down' : 'ph-caret-up';
      chevronWrap.innerHTML = `<i class="ph ${iconName} text-xs"></i>`;
    });

    section.appendChild(header);

    for (const entry of entries) {
      const item = document.createElement('button');
      item.className =
        'toolbox-node-item w-full text-left px-2 py-1.5 rounded-md ui-text-secondary ui-hover-bg-raised ui-hover-text-primary transition-colors text-xs flex items-center gap-2';
      const nodeType = Object.keys(nodeRegistry).find(
        (k) => nodeRegistry[k] === entry
      )!;
      const translatedLabel = translateNodeLabel(nodeType, entry);
      item.dataset.label = translatedLabel;
      item.dataset.type = nodeType;

      const iconEl = document.createElement('i');
      iconEl.className = `ph ${entry.icon} text-sm flex-shrink-0`;
      item.appendChild(iconEl);

      const labelEl = document.createElement('span');
      labelEl.textContent = translatedLabel;
      item.appendChild(labelEl);

      item.addEventListener('click', () => {
        addNodeToCanvas(item.dataset.type!);
        if (window.innerWidth < 768) {
          document.getElementById('toolbox-sidebar')?.classList.add('hidden');
          document.getElementById('toolbox-sidebar')?.classList.remove('flex');
          document.getElementById('toolbox-backdrop')?.classList.add('hidden');
        }
      });

      item.draggable = true;
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData(
          'application/rete-node-type',
          item.dataset.type!
        );
        e.dataTransfer!.effectAllowed = 'copy';
      });

      itemsContainer.appendChild(item);
    }

    section.appendChild(itemsContainer);
    container.appendChild(section);
  }

  const reteContainer = document.getElementById('rete-container');
  if (reteContainer) {
    reteContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    });
    reteContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      const nodeType = e.dataTransfer?.getData('application/rete-node-type');
      if (!nodeType || !workflowEditor) return;

      const { area } = workflowEditor;
      const rect = reteContainer.getBoundingClientRect();
      const { x: tx, y: ty, k } = area.area.transform;
      const x = (e.clientX - rect.left - tx) / k;
      const y = (e.clientY - rect.top - ty) / k;
      addNodeToCanvas(nodeType, { x, y });
    });
  }
}

async function addNodeToCanvas(
  type: string,
  position?: { x: number; y: number }
) {
  if (!workflowEditor) return;
  const { editor, area } = workflowEditor;

  try {
    const node = createNodeByType(type);
    if (!node) {
      console.error(
        'Node type not found in registry:',
        String(type).replace(/[\r\n]+/g, ' ')
      );
      return;
    }
    await editor.addNode(node);

    const pos = position || getCanvasCenter(area);
    await area.translate(node.id, pos);
  } catch (err) {
    console.error('Failed to add node to canvas:', err);
  }
}

function getCanvasCenter(area: WorkflowEditor['area']): {
  x: number;
  y: number;
} {
  const container = area.container;
  const rect = container.getBoundingClientRect();
  const { x: tx, y: ty, k } = area.area.transform;
  const cx = (rect.width / 2 - tx) / k;
  const cy = (rect.height / 2 - ty) / k;
  return {
    x: cx + (Math.random() - 0.5) * 100,
    y: cy + (Math.random() - 0.5) * 100,
  };
}

function buildFileList(
  container: HTMLElement,
  filenames: string[],
  onRemove: (index: number) => void
) {
  const list = document.createElement('div');
  list.className = 'flex flex-col gap-1.5 mb-2';

  filenames.forEach((name, i) => {
    const row = document.createElement('div');
    row.className =
      'flex items-center justify-between ui-bg-canvas rounded-lg px-3 py-2';

    const nameEl = document.createElement('span');
    nameEl.className = 'text-sm ui-text-primary truncate flex-1 mr-2';
    nameEl.textContent = name;
    row.appendChild(nameEl);

    const removeBtn = document.createElement('button');
    removeBtn.className =
      'ui-text-tertiary hover:ui-text-danger text-lg leading-none flex-shrink-0';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => onRemove(i));
    row.appendChild(removeBtn);

    list.appendChild(row);
  });

  container.appendChild(list);
}

function promptPdfPassword(filename: string): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = document.getElementById('pdf-password-modal')!;
    const filenameEl = document.getElementById('pdf-password-filename')!;
    const input = document.getElementById(
      'pdf-password-input'
    ) as HTMLInputElement;
    const errorEl = document.getElementById('pdf-password-error')!;
    const skipBtn = document.getElementById('pdf-password-skip')!;
    const unlockBtn = document.getElementById('pdf-password-unlock')!;

    filenameEl.textContent = filename;
    input.value = '';
    errorEl.classList.add('hidden');
    modal.classList.remove('hidden');
    input.focus();

    const cleanup = () => {
      modal.classList.add('hidden');
      skipBtn.replaceWith(skipBtn.cloneNode(true));
      unlockBtn.replaceWith(unlockBtn.cloneNode(true));
      input.removeEventListener('keydown', onKeydown);
    };

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        cleanup();
        resolve(input.value || null);
      }
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    };

    input.addEventListener('keydown', onKeydown);
    document
      .getElementById('pdf-password-skip')!
      .addEventListener('click', () => {
        cleanup();
        resolve(null);
      });
    document
      .getElementById('pdf-password-unlock')!
      .addEventListener('click', () => {
        cleanup();
        resolve(input.value || null);
      });
  });
}

function showNodeSettings(node: BaseWorkflowNode) {
  const sidebar = document.getElementById('settings-sidebar');
  const title = document.getElementById('settings-title');
  const content = document.getElementById('settings-content');
  if (!sidebar || !title || !content) return;

  sidebar.classList.remove('hidden');
  title.textContent = node.label;
  content.innerHTML = '';

  if (node instanceof PDFInputNode) {
    const fileSection = document.createElement('div');

    const label = document.createElement('label');
    label.className = 'block text-xs ui-text-secondary mb-1';
    label.textContent = translate('common.dynamic.afadf7dd74', 'PDF Files');
    fileSection.appendChild(label);

    if (node.hasFile()) {
      buildFileList(fileSection, node.getFilenames(), (index) => {
        node.removeFile(index);
        showNodeSettings(node);
      });
    }

    const uploadBtn = document.createElement('button');
    uploadBtn.className =
      'w-full ui-bg-raised ui-hover-bg-raised ui-text-primary text-xs px-3 py-2 rounded-lg transition-colors';
    uploadBtn.textContent = node.hasFile()
      ? translate('tools:pdfWorkflow.addMoreFiles', 'Add More Files')
      : translate('tools:pdfWorkflow.uploadPdfs', 'Upload PDFs');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.multiple = true;
    fileInput.className = 'hidden';
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length === 0) return;
      for (const file of files) {
        try {
          await node.addFile(file);
        } catch (err) {
          if (err instanceof EncryptedPDFError) {
            const password = await promptPdfPassword(file.name);
            if (password) {
              try {
                await node.addDecryptedFile(file, password);
              } catch {
                showAlert(
                  translate('alert.error', 'Error'),
                  translate(
                    'common.dynamic.a3b53812df',
                    `Wrong password or failed to decrypt "${file.name}".`,
                    { value0: file.name }
                  )
                );
              }
            }
          } else {
            console.error('[PdfWorkflow] PDF input failed:', err);
            showAlert(
              translate('alert.error', 'Error'),
              translate(
                'tools:pdfWorkflow.pdfLoadFailed',
                'Failed to load PDF. Please try again.'
              )
            );
          }
        }
      }
      showNodeSettings(node);
    });

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileSection.appendChild(uploadBtn);
    fileSection.appendChild(fileInput);
    content.appendChild(fileSection);
    return;
  }

  if (node instanceof ImageInputNode) {
    const fileSection = document.createElement('div');

    const label = document.createElement('label');
    label.className = 'block text-xs ui-text-secondary mb-1';
    label.textContent = translate('common.dynamic.2d588ecddd', 'Images');
    fileSection.appendChild(label);

    const formatHint = document.createElement('p');
    formatHint.className = 'text-xs ui-text-tertiary mb-2';
    formatHint.textContent = translate(
      'common.dynamic.0692b26df8',
      'Supported: JPG, PNG, BMP, GIF, TIFF, WebP, HEIC, PSD, SVG, PNM, PGM, PBM, PPM, PAM, JXR, JPX, JP2'
    );
    fileSection.appendChild(formatHint);

    if (node.hasFile()) {
      buildFileList(fileSection, node.getFilenames(), (index) => {
        node.removeFile(index);
        showNodeSettings(node);
      });
    }

    const uploadBtn = document.createElement('button');
    uploadBtn.className =
      'w-full ui-bg-raised ui-hover-bg-raised ui-text-primary text-xs px-3 py-2 rounded-lg transition-colors';
    uploadBtn.textContent = node.hasFile()
      ? translate('tools:pdfWorkflow.addMoreImages', 'Add More Images')
      : translate('tools:pdfWorkflow.uploadImages', 'Upload Images');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = IMAGE_ACCEPT;
    fileInput.multiple = true;
    fileInput.className = 'hidden';
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length === 0) return;
      try {
        await node.addFiles(files);
        showNodeSettings(node);
      } catch (err) {
        console.error('[PdfWorkflow] Image input failed:', err);
        showAlert(
          translate('alert.error', 'Error'),
          translate(
            'tools:pdfWorkflow.imageLoadFailed',
            'Failed to load images. Please try again.'
          )
        );
      }
    });

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileSection.appendChild(uploadBtn);
    fileSection.appendChild(fileInput);
    content.appendChild(fileSection);
    return;
  }

  if (node instanceof DigitalSignNode) {
    const certSection = document.createElement('div');

    const certLabel = document.createElement('label');
    certLabel.className = 'block text-xs ui-text-secondary mb-1';
    certLabel.textContent = translate(
      'common.dynamic.da110cd748',
      'Certificate (.pfx, .p12, .pem)'
    );
    certSection.appendChild(certLabel);

    if (node.hasCertFile()) {
      const certFileDiv = document.createElement('div');
      certFileDiv.className =
        'flex items-center justify-between ui-bg-raised px-3 py-2 rounded-lg mb-2';

      const certName = document.createElement('span');
      certName.className = 'text-xs ui-text-primary truncate flex-1';
      certName.textContent = node.getCertFilename();

      const statusDot = document.createElement('span');
      statusDot.className = `w-2 h-2 rounded-full flex-shrink-0 mx-2 ${node.hasCert() ? 'bg-green-400' : 'bg-yellow-400'}`;

      const removeBtn = document.createElement('button');
      removeBtn.className =
        'ui-text-danger ui-hover-text-danger text-xs flex-shrink-0';
      removeBtn.textContent = translate('common.dynamic.559f7af87a', 'Remove');
      removeBtn.addEventListener('click', () => {
        node.removeCert();
        showNodeSettings(node);
      });

      certFileDiv.append(certName, statusDot, removeBtn);
      certSection.appendChild(certFileDiv);

      if (node.needsPassword()) {
        const pwSection = document.createElement('div');
        pwSection.className = 'mb-2';

        const pwLabel = document.createElement('label');
        pwLabel.className = 'block text-xs ui-text-secondary mb-1';
        pwLabel.textContent = translate(
          'common.dynamic.5373b3a229',
          'Certificate Password'
        );
        pwSection.appendChild(pwLabel);

        const pwRow = document.createElement('div');
        pwRow.className = 'flex gap-2';

        const pwInput = document.createElement('input');
        pwInput.type = 'password';
        pwInput.placeholder = translate(
          'common.dynamic.f26bba9bdb',
          'Enter password...'
        );
        pwInput.className =
          'flex-1 ui-bg-raised border ui-border ui-text-primary text-xs px-3 py-2 rounded-lg focus:outline-none ui-focus-ring';

        const unlockBtn = document.createElement('button');
        unlockBtn.className =
          'ui-bg-action ui-hover-bg-action ui-text-primary text-xs px-3 py-2 rounded-lg transition-colors flex-shrink-0';
        unlockBtn.textContent = translate(
          'common.dynamic.3b93feeaca',
          'Unlock'
        );

        const statusMsg = document.createElement('div');
        statusMsg.className = 'text-xs mt-1 hidden';

        const doUnlock = async () => {
          const pw = pwInput.value;
          if (!pw) return;
          unlockBtn.textContent = translate(
            'common.dynamic.f370a981e4',
            'Unlocking...'
          );
          unlockBtn.disabled = true;
          const success = await node.unlockCert(pw);
          if (success) {
            showNodeSettings(node);
          } else {
            unlockBtn.textContent = translate(
              'common.dynamic.3b93feeaca',
              'Unlock'
            );
            unlockBtn.disabled = false;
            statusMsg.textContent = translate(
              'common.dynamic.ae7cf1e34f',
              'Incorrect password'
            );
            statusMsg.className = 'text-xs mt-1 ui-text-danger';
            statusMsg.classList.remove('hidden');
          }
        };

        unlockBtn.addEventListener('click', doUnlock);
        pwInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') doUnlock();
        });

        pwRow.append(pwInput, unlockBtn);
        pwSection.append(pwRow, statusMsg);
        certSection.appendChild(pwSection);
      } else if (node.hasCert()) {
        const okMsg = document.createElement('div');
        okMsg.className = 'text-xs ui-text-success mb-2';
        okMsg.textContent = translate(
          'common.dynamic.e190be9174',
          'Certificate unlocked'
        );
        certSection.appendChild(okMsg);
      }
    }

    const uploadBtn = document.createElement('button');
    uploadBtn.className =
      'w-full ui-bg-raised ui-hover-bg-raised ui-text-primary text-xs px-3 py-2 rounded-lg transition-colors';
    uploadBtn.textContent = node.hasCertFile()
      ? translate('tools:pdfWorkflow.changeCertificate', 'Change Certificate')
      : translate('tools:pdfWorkflow.uploadCertificate', 'Upload Certificate');

    const certInput = document.createElement('input');
    certInput.type = 'file';
    certInput.accept = '.pfx,.p12,.pem';
    certInput.className = 'hidden';
    certInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      node.setCertFile(file);

      const isPem = file.name.toLowerCase().endsWith('.pem');
      if (isPem) {
        file.text().then(async (pemContent) => {
          const isEncrypted = pemContent.includes('ENCRYPTED');
          if (!isEncrypted) {
            await node.unlockCert('');
          }
          showNodeSettings(node);
        });
      } else {
        showNodeSettings(node);
      }
    });

    uploadBtn.addEventListener('click', () => certInput.click());
    certSection.append(uploadBtn, certInput);
    content.appendChild(certSection);

    const divider = document.createElement('div');
    divider.className = 'border-t ui-border-subtle my-3';
    content.appendChild(divider);
  }

  interface FileInputNode extends BaseWorkflowNode {
    hasFile(): boolean;
    getFilenames(): string[];
    removeFile(index: number): void;
    addFiles(files: File[]): Promise<void>;
  }

  const fileInputConfigs: {
    cls: new (...args: unknown[]) => FileInputNode;
    label: string;
    accept: string;
    btnLabel: string;
    hint?: string;
  }[] = [
    {
      cls: WordToPdfNode,
      label: 'Word Documents',
      accept: '.doc,.docx,.odt,.rtf',
      btnLabel: 'Documents',
      hint: 'Supported: DOC, DOCX, ODT, RTF',
    },
    {
      cls: ExcelToPdfNode,
      label: 'Spreadsheets',
      accept: '.xlsx,.xls,.ods,.csv',
      btnLabel: 'Spreadsheets',
      hint: 'Supported: XLSX, XLS, ODS, CSV',
    },
    {
      cls: PowerPointToPdfNode,
      label: 'Presentations',
      accept: '.ppt,.pptx,.odp',
      btnLabel: 'Presentations',
      hint: 'Supported: PPT, PPTX, ODP',
    },
    {
      cls: TextToPdfNode,
      label: 'Text Files',
      accept: '.txt',
      btnLabel: 'Text Files',
    },
    {
      cls: SvgToPdfNode,
      label: 'SVG Files',
      accept: '.svg',
      btnLabel: 'SVG Files',
    },
    {
      cls: EpubToPdfNode,
      label: 'EPUB Files',
      accept: '.epub',
      btnLabel: 'EPUB Files',
    },
    {
      cls: EmailToPdfNode,
      label: 'Email Files',
      accept: '.eml,.msg',
      btnLabel: 'Email Files',
      hint: 'Supported: EML, MSG',
    },
    {
      cls: XpsToPdfNode,
      label: 'XPS Files',
      accept: '.xps,.oxps',
      btnLabel: 'XPS Files',
      hint: 'Supported: XPS, OXPS',
    },
    {
      cls: MobiToPdfNode,
      label: 'MOBI Files',
      accept: '.mobi',
      btnLabel: 'MOBI Files',
    },
    {
      cls: Fb2ToPdfNode,
      label: 'FB2 Files',
      accept: '.fb2',
      btnLabel: 'FB2 Files',
    },
    {
      cls: CbzToPdfNode,
      label: 'Comic Archives',
      accept: '.cbz,.cbr',
      btnLabel: 'Comics',
      hint: 'Supported: CBZ, CBR',
    },
    {
      cls: MarkdownToPdfNode,
      label: 'Markdown Files',
      accept: '.md,.markdown',
      btnLabel: 'Markdown Files',
    },
    {
      cls: JsonToPdfNode,
      label: 'JSON Files',
      accept: '.json',
      btnLabel: 'JSON Files',
    },
    {
      cls: XmlToPdfNode,
      label: 'XML Files',
      accept: '.xml',
      btnLabel: 'XML Files',
    },
    {
      cls: WpdToPdfNode,
      label: 'WordPerfect Files',
      accept: '.wpd',
      btnLabel: 'WPD Files',
    },
    {
      cls: WpsToPdfNode,
      label: 'WPS Files',
      accept: '.wps',
      btnLabel: 'WPS Files',
    },
    {
      cls: PagesToPdfNode,
      label: 'Pages Files',
      accept: '.pages',
      btnLabel: 'Pages Files',
    },
    {
      cls: OdgToPdfNode,
      label: 'ODG Files',
      accept: '.odg',
      btnLabel: 'ODG Files',
    },
    {
      cls: PubToPdfNode,
      label: 'Publisher Files',
      accept: '.pub',
      btnLabel: 'PUB Files',
    },
    {
      cls: VsdToPdfNode,
      label: 'Visio Files',
      accept: '.vsd,.vsdx',
      btnLabel: 'Visio Files',
      hint: 'Supported: VSD, VSDX',
    },
  ];

  const fileLabelI18nKeys: Record<string, string> = {
    'Word Documents': 'tools:pdfWorkflow.fileLabels.wordDocsLabel',
    Spreadsheets: 'tools:pdfWorkflow.fileLabels.spreadsheetsLabel',
    Presentations: 'tools:pdfWorkflow.fileLabels.presentationsLabel',
    'Text Files': 'tools:pdfWorkflow.fileLabels.textFilesLabel',
    'SVG Files': 'tools:pdfWorkflow.fileLabels.svgFilesLabel',
    'EPUB Files': 'tools:pdfWorkflow.fileLabels.epubFilesLabel',
    'Email Files': 'tools:pdfWorkflow.fileLabels.emailFilesLabel',
    'XPS Files': 'tools:pdfWorkflow.fileLabels.xpsFilesLabel',
    'MOBI Files': 'tools:pdfWorkflow.fileLabels.mobiFilesLabel',
    'FB2 Files': 'tools:pdfWorkflow.fileLabels.fb2FilesLabel',
    'Comic Archives': 'tools:pdfWorkflow.fileLabels.comicArchivesLabel',
    'Markdown Files': 'tools:pdfWorkflow.fileLabels.markdownFilesLabel',
    'JSON Files': 'tools:pdfWorkflow.fileLabels.jsonFilesLabel',
    'XML Files': 'tools:pdfWorkflow.fileLabels.xmlFilesLabel',
    'WordPerfect Files': 'tools:pdfWorkflow.fileLabels.wordPerfectFilesLabel',
    'WPS Files': 'tools:pdfWorkflow.fileLabels.wpsFilesLabel',
    'Pages Files': 'tools:pdfWorkflow.fileLabels.pagesFilesLabel',
    'ODG Files': 'tools:pdfWorkflow.fileLabels.odgFilesLabel',
    'Publisher Files': 'tools:pdfWorkflow.fileLabels.publisherFilesLabel',
    'Visio Files': 'tools:pdfWorkflow.fileLabels.visioFilesLabel',
  };

  const fileHintI18nKeys: Record<string, string> = {
    'Supported: DOC, DOCX, ODT, RTF':
      'tools:pdfWorkflow.fileLabels.wordDocsHint',
    'Supported: XLSX, XLS, ODS, CSV':
      'tools:pdfWorkflow.fileLabels.spreadsheetsHint',
    'Supported: PPT, PPTX, ODP':
      'tools:pdfWorkflow.fileLabels.presentationsHint',
    'Supported: EML, MSG': 'tools:pdfWorkflow.fileLabels.emailHint',
    'Supported: XPS, OXPS': 'tools:pdfWorkflow.fileLabels.xpsHint',
    'Supported: CBZ, CBR': 'tools:pdfWorkflow.fileLabels.comicsHint',
    'Supported: VSD, VSDX': 'tools:pdfWorkflow.fileLabels.visioHint',
  };

  const fileBtnLabelI18nKeys: Record<string, string> = {
    Documents: 'tools:pdfWorkflow.fileLabels.documentsBtnLabel',
    Spreadsheets: 'tools:pdfWorkflow.fileLabels.spreadsheetsBtnLabel',
    Presentations: 'tools:pdfWorkflow.fileLabels.presentationsBtnLabel',
    'Text Files': 'tools:pdfWorkflow.fileLabels.textFilesBtnLabel',
    'SVG Files': 'tools:pdfWorkflow.fileLabels.svgFilesBtnLabel',
    'EPUB Files': 'tools:pdfWorkflow.fileLabels.epubFilesBtnLabel',
    'Email Files': 'tools:pdfWorkflow.fileLabels.emailFilesBtnLabel',
    'XPS Files': 'tools:pdfWorkflow.fileLabels.xpsFilesBtnLabel',
    'MOBI Files': 'tools:pdfWorkflow.fileLabels.mobiFilesBtnLabel',
    'FB2 Files': 'tools:pdfWorkflow.fileLabels.fb2FilesBtnLabel',
    Comics: 'tools:pdfWorkflow.fileLabels.comicsBtnLabel',
    'Markdown Files': 'tools:pdfWorkflow.fileLabels.markdownFilesBtnLabel',
    'JSON Files': 'tools:pdfWorkflow.fileLabels.jsonFilesBtnLabel',
    'XML Files': 'tools:pdfWorkflow.fileLabels.xmlFilesBtnLabel',
    'WPD Files': 'tools:pdfWorkflow.fileLabels.wpdFilesBtnLabel',
    'WPS Files': 'tools:pdfWorkflow.fileLabels.wpsFilesBtnLabel',
    'Pages Files': 'tools:pdfWorkflow.fileLabels.pagesFilesBtnLabel',
    'ODG Files': 'tools:pdfWorkflow.fileLabels.odgFilesBtnLabel',
    'PUB Files': 'tools:pdfWorkflow.fileLabels.pubFilesBtnLabel',
    'Visio Files': 'tools:pdfWorkflow.fileLabels.visioFilesBtnLabel',
  };

  const fileInputConfig = fileInputConfigs.find((c) => node instanceof c.cls);
  if (fileInputConfig) {
    const fileNode = node as InstanceType<typeof fileInputConfig.cls>;
    const fileSection = document.createElement('div');

    const label = document.createElement('label');
    label.className = 'block text-xs ui-text-secondary mb-1';
    const labelKey = fileLabelI18nKeys[fileInputConfig.label];
    label.textContent = labelKey
      ? translate(labelKey, fileInputConfig.label)
      : fileInputConfig.label;
    fileSection.appendChild(label);

    if (fileInputConfig.hint) {
      const hint = document.createElement('p');
      hint.className = 'text-xs ui-text-tertiary mb-2';
      const hintKey = fileHintI18nKeys[fileInputConfig.hint];
      hint.textContent = hintKey
        ? translate(hintKey, fileInputConfig.hint)
        : fileInputConfig.hint;
      fileSection.appendChild(hint);
    }

    if (fileNode.hasFile()) {
      buildFileList(fileSection, fileNode.getFilenames(), (index) => {
        fileNode.removeFile(index);
        showNodeSettings(node);
      });
    }

    const uploadBtn = document.createElement('button');
    uploadBtn.className =
      'w-full ui-bg-raised ui-hover-bg-raised ui-text-primary text-xs px-3 py-2 rounded-lg transition-colors';
    const btnLabelKey = fileBtnLabelI18nKeys[fileInputConfig.btnLabel];
    const translatedBtnLabel = btnLabelKey
      ? translate(btnLabelKey, fileInputConfig.btnLabel)
      : fileInputConfig.btnLabel;
    uploadBtn.textContent = fileNode.hasFile()
      ? translate(
          'tools:pdfWorkflow.addMoreBtnLabel',
          `Add More ${fileInputConfig.btnLabel}`,
          { value0: translatedBtnLabel }
        )
      : translate(
          'tools:pdfWorkflow.uploadBtnLabel',
          `Upload ${fileInputConfig.btnLabel}`,
          { value0: translatedBtnLabel }
        );

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = fileInputConfig.accept;
    fileInput.multiple = true;
    fileInput.className = 'hidden';
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      if (files.length === 0) return;
      try {
        await fileNode.addFiles(files);
        showNodeSettings(node);
      } catch (err) {
        console.error('[PdfWorkflow] File input failed:', err);
        showAlert(
          translate('alert.error', 'Error'),
          translate(
            'tools:pdfWorkflow.fileLoadFailed',
            'Failed to load files. Please try again.'
          )
        );
      }
    });

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileSection.appendChild(uploadBtn);
    fileSection.appendChild(fileInput);
    content.appendChild(fileSection);

    const controlEntries = Object.entries(node.controls);
    if (controlEntries.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'border-t ui-border-subtle my-3';
      content.appendChild(divider);
    } else {
      return;
    }
  }

  const controlEntries = Object.entries(node.controls);
  if (controlEntries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-xs ui-text-tertiary';
    empty.textContent = translate(
      'common.dynamic.5b84f0b598',
      'No configurable settings for this node.'
    );
    content.appendChild(empty);
    return;
  }

  const dropdownOptions: Record<string, { label: string; value: string }[]> = {
    format: [
      { label: 'JPG', value: 'jpg' },
      { label: 'PNG', value: 'png' },
      { label: 'WebP', value: 'webp' },
      { label: 'SVG', value: 'svg' },
    ],
    position: [
      { label: 'Bottom Center', value: 'bottom-center' },
      { label: 'Bottom Left', value: 'bottom-left' },
      { label: 'Bottom Right', value: 'bottom-right' },
      { label: 'Top Center', value: 'top-center' },
      { label: 'Top Left', value: 'top-left' },
      { label: 'Top Right', value: 'top-right' },
    ],
    orientation: [
      { label: 'Auto (Keep Original)', value: 'auto' },
      { label: 'Portrait', value: 'portrait' },
      { label: 'Landscape', value: 'landscape' },
    ],
    direction: [
      { label: 'Vertical', value: 'vertical' },
      { label: 'Horizontal', value: 'horizontal' },
    ],
    pagesPerSheet: [
      { label: '2', value: '2' },
      { label: '4', value: '4' },
      { label: '9', value: '9' },
      { label: '16', value: '16' },
    ],
    fontFamily: [
      { label: 'Helvetica', value: 'helv' },
      { label: 'Times Roman', value: 'times' },
      { label: 'Courier', value: 'cour' },
      { label: 'Times Italic', value: 'tiro' },
    ],
    pageSize: [
      { label: 'A4', value: 'a4' },
      { label: 'Letter', value: 'letter' },
      { label: 'Legal', value: 'legal' },
    ],
    targetSize: [
      { label: 'A4', value: 'A4' },
      { label: 'Letter', value: 'Letter' },
      { label: 'Legal', value: 'Legal' },
      { label: 'A3', value: 'A3' },
      { label: 'A5', value: 'A5' },
      { label: 'Tabloid', value: 'Tabloid' },
      { label: 'Custom', value: 'Custom' },
    ],
    scalingMode: [
      { label: 'Fit (keep full page visible)', value: 'fit' },
      { label: 'Fill (cover full target page)', value: 'fill' },
    ],
    customUnits: [
      { label: 'Millimeters (mm)', value: 'mm' },
      { label: 'Inches (in)', value: 'in' },
    ],
    numberFormat: [
      { label: 'Simple (1, 2, 3)', value: 'simple' },
      { label: 'Page X of Y', value: 'page_x_of_y' },
    ],
    angle: [
      { label: '90° Clockwise', value: '90' },
      { label: '180°', value: '180' },
      { label: '90° Counter-clockwise', value: '270' },
    ],
    blankPosition: [
      { label: 'End', value: 'end' },
      { label: 'Beginning', value: 'start' },
      { label: 'After Page...', value: 'after' },
    ],
    resolution: [
      { label: 'Standard (192 DPI)', value: '2.0' },
      { label: 'High (288 DPI)', value: '3.0' },
      { label: 'Ultra (384 DPI)', value: '4.0' },
    ],
    language: getAvailableTesseractLanguageEntries().map(([code, name]) => ({
      label: name,
      value: code,
    })),
    gridMode: [
      { label: '1x2 (Booklet)', value: '1x2' },
      { label: '2x2 (4-up)', value: '2x2' },
      { label: '2x4 (8-up)', value: '2x4' },
      { label: '4x4 (16-up)', value: '4x4' },
    ],
    paperSize: [
      { label: 'Letter', value: 'Letter' },
      { label: 'A4', value: 'A4' },
      { label: 'A3', value: 'A3' },
      { label: 'Tabloid', value: 'Tabloid' },
      { label: 'Legal', value: 'Legal' },
    ],
    rasterizeDpi: [
      { label: '72 (Screen)', value: '72' },
      { label: '150 (Default)', value: '150' },
      { label: '200 (Good)', value: '200' },
      { label: '300 (Print)', value: '300' },
      { label: '600 (High Quality)', value: '600' },
    ],
    imageFormat: [
      { label: 'PNG (Lossless)', value: 'png' },
      { label: 'JPEG (Smaller file size)', value: 'jpeg' },
    ],
    skewThreshold: [
      { label: '0.1° (Very Sensitive)', value: '0.1' },
      { label: '0.5° (Default)', value: '0.5' },
      { label: '1.0° (Normal)', value: '1.0' },
      { label: '2.0° (Less Sensitive)', value: '2.0' },
    ],
    processingDpi: [
      { label: '100 (Fast)', value: '100' },
      { label: '150 (Default)', value: '150' },
      { label: '200 (Better)', value: '200' },
      { label: '300 (Best Quality)', value: '300' },
    ],
    level: [
      { label: 'PDF/A-1b (Strict, no transparency)', value: 'PDF/A-1b' },
      { label: 'PDF/A-2b (Recommended)', value: 'PDF/A-2b' },
      { label: 'PDF/A-3b (Modern, allows attachments)', value: 'PDF/A-3b' },
    ],
    algorithm: [
      { label: 'Condense (Smart, requires PyMuPDF)', value: 'condense' },
      { label: 'Photon (Rasterize pages)', value: 'photon' },
    ],
    compressionLevel: [
      { label: 'Light', value: 'light' },
      { label: 'Balanced', value: 'balanced' },
      { label: 'Aggressive', value: 'aggressive' },
      { label: 'Extreme', value: 'extreme' },
    ],
    redactMode: [
      { label: 'Search Text', value: 'text' },
      { label: 'Area (Coordinates)', value: 'area' },
    ],
  };

  const booleanControls = new Set([
    'grayscale',
    'border',
    'margins',
    'separator',
    'sepia',
    'includeCcBcc',
    'includeAttachments',
    'binarize',
    'preFlatten',
    'flattenForms',
    'removeMetadata',
    'removeAnnotations',
    'removeJavascript',
    'removeEmbeddedFiles',
    'removeLayers',
    'removeLinks',
    'removeStructureTree',
    'removeMarkInfo',
    'removeFonts',
    'subsetFonts',
    'convertToGrayscale',
    'removeThumbnails',
    'retainPageLabels',
  ]);
  const multiSelectDropdowns = new Set(['language']);
  const advancedControls = new Set(['resolution', 'binarize', 'whitelist']);

  const colorControls = new Set([
    'color',
    'borderColor',
    'backgroundColor',
    'separatorColor',
    'fontColor',
    'fillColor',
  ]);

  const controlHints: Record<string, string> = {
    pages: 'e.g. 1-3, 5, 7-9',
    whitelist: 'Limit recognized characters (leave empty for all)',
    afterPage: 'Insert blank pages after this page number',
    x0: 'Left edge in points (1 inch = 72 pts)',
    y0: 'Top edge in points',
    x1: 'Right edge in points',
    y1: 'Bottom edge in points',
    retainPageLabels:
      "Off (default): natural 1–N numbering. On: each file's original page labels are preserved (may produce duplicate labels).",
  };

  const hintI18nKeys: Record<string, string> = {
    pages: 'tools:pdfWorkflow.pageRangeHint',
    whitelist: 'tools:pdfWorkflow.whitelistHint',
    afterPage: 'tools:pdfWorkflow.afterPageHint',
    x0: 'tools:pdfWorkflow.x0Hint',
    y0: 'tools:pdfWorkflow.y0Hint',
    x1: 'tools:pdfWorkflow.x1Hint',
    y1: 'tools:pdfWorkflow.y1Hint',
    retainPageLabels: 'tools:pdfWorkflow.retainPageLabelsHint',
  };

  const inputClass =
    'w-full ui-bg-canvas border ui-border ui-text-primary rounded-md px-2 py-1.5 text-xs ui-focus-ring focus:outline-none';

  const conditionalVisibility: Record<string, Record<string, string[]>> = {
    redactMode: {
      text: ['text'],
      area: ['x0', 'y0', 'x1', 'y1'],
    },
    targetSize: {
      Custom: ['customWidth', 'customHeight', 'customUnits'],
    },
  };

  const controlWrappers: Record<string, HTMLElement> = {};
  const hasAdvanced = controlEntries.some(([key]) => advancedControls.has(key));
  const advancedWrappers: HTMLElement[] = [];

  for (const [key, control] of controlEntries) {
    const wrapper = document.createElement('div');
    controlWrappers[key] = wrapper;
    const ctrl = control as { value?: unknown; type?: string };
    const currentValue = String(ctrl.value ?? '');

    const controlLabel = document.createElement('label');
    controlLabel.className = 'block text-xs ui-text-secondary mb-1';
    controlLabel.textContent = formatLabel(key);
    wrapper.appendChild(controlLabel);

    if (dropdownOptions[key] && multiSelectDropdowns.has(key)) {
      const selectedValues = new Set(
        currentValue ? currentValue.split('+') : []
      );
      const container = document.createElement('div');
      container.className = 'flex flex-col gap-1';

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = translate(
        'common.dynamic.6e6cd59800',
        'Search languages...'
      );
      searchInput.className = inputClass;
      container.appendChild(searchInput);

      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'flex flex-wrap gap-1 min-h-[24px]';
      container.appendChild(tagsDiv);

      const listDiv = document.createElement('div');
      listDiv.className =
        'max-h-32 overflow-y-auto ui-bg-surface rounded border ui-border mt-1';
      container.appendChild(listDiv);

      function updateTags() {
        tagsDiv.innerHTML = '';
        for (const val of selectedValues) {
          const opt = dropdownOptions[key].find((o) => o.value === val);
          if (!opt) continue;
          const tag = document.createElement('span');
          tag.className =
            'inline-flex items-center gap-1 px-2 py-0.5 rounded ui-bg-action ui-text-primary text-xs';
          tag.textContent = opt.label;
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.textContent = translate(
            'common.dynamic.a759dd7bf6',
            '\u00d7'
          );
          removeBtn.className =
            'text-white/70 ui-hover-text-primary text-xs leading-none';
          removeBtn.addEventListener('click', () => {
            selectedValues.delete(val);
            updateTags();
            updateCtrl();
            renderList(searchInput.value);
          });
          tag.appendChild(removeBtn);
          tagsDiv.appendChild(tag);
        }
      }

      function updateCtrl() {
        (ctrl as { value: string }).value =
          Array.from(selectedValues).join('+');
      }

      function renderList(filter: string) {
        listDiv.innerHTML = '';
        const lowerFilter = filter.toLowerCase();
        for (const opt of dropdownOptions[key]) {
          if (lowerFilter && !opt.label.toLowerCase().includes(lowerFilter))
            continue;
          const label = document.createElement('label');
          label.className =
            'flex items-center gap-2 px-2 py-1 ui-hover-bg-raised cursor-pointer text-xs ui-text-secondary';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = selectedValues.has(opt.value);
          cb.className =
            'w-3 h-3 rounded ui-text-action ui-bg-raised ui-border';
          cb.addEventListener('change', () => {
            if (cb.checked) {
              selectedValues.add(opt.value);
            } else {
              selectedValues.delete(opt.value);
            }
            updateTags();
            updateCtrl();
          });
          label.appendChild(cb);
          label.appendChild(document.createTextNode(opt.label));
          listDiv.appendChild(label);
        }
      }

      searchInput.addEventListener('input', (e: Event) => {
        if ((e as any).isComposing) return;
        renderList(searchInput.value);
      });

      updateTags();
      renderList('');
      wrapper.appendChild(container);
    } else if (dropdownOptions[key]) {
      const select = document.createElement('select');
      select.className = inputClass;
      for (const opt of dropdownOptions[key]) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (currentValue === opt.value) option.selected = true;
        select.appendChild(option);
      }
      select.addEventListener('change', () => {
        (ctrl as { value: string }).value = select.value;
        if (conditionalVisibility[key]) {
          applyConditionalVisibility(key, select.value);
        }
      });
      wrapper.appendChild(select);
    } else if (booleanControls.has(key)) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      const isOn = currentValue === 'true';
      toggle.className = `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${isOn ? 'ui-bg-action' : 'ui-bg-raised'}`;
      const dot = document.createElement('span');
      dot.className = `pointer-events-none absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full ui-bg-light shadow-md transition-transform duration-200 ${isOn ? 'translate-x-5' : 'translate-x-0'}`;
      toggle.appendChild(dot);
      toggle.addEventListener('click', () => {
        const newVal =
          (ctrl as { value: string }).value === 'true' ? 'false' : 'true';
        (ctrl as { value: string }).value = newVal;
        const on = newVal === 'true';
        toggle.className = `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${on ? 'ui-bg-action' : 'ui-bg-raised'}`;
        dot.className = `pointer-events-none absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full ui-bg-light shadow-md transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`;
      });
      wrapper.appendChild(toggle);
    } else if (colorControls.has(key)) {
      const colorRow = document.createElement('div');
      colorRow.className = 'flex items-center gap-2';
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = currentValue || '#000000';
      colorInput.className = 'w-8 h-8 rounded bg-transparent cursor-pointer';
      const hexInput = document.createElement('input');
      hexInput.type = 'text';
      hexInput.value = currentValue || '#000000';
      hexInput.className = inputClass + ' flex-1';
      colorInput.addEventListener('input', () => {
        hexInput.value = colorInput.value;
        (ctrl as { value: string }).value = colorInput.value;
      });
      hexInput.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
          colorInput.value = hexInput.value;
        }
        (ctrl as { value: string }).value = hexInput.value;
      });
      colorRow.appendChild(colorInput);
      colorRow.appendChild(hexInput);
      wrapper.appendChild(colorRow);
    } else if (ctrl.type === 'number' || typeof ctrl.value === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = inputClass;
      input.value = currentValue;
      input.addEventListener('input', () => {
        const num = parseFloat(input.value);
        if (!isNaN(num)) {
          (ctrl as { value: number }).value = num;
        }
      });
      wrapper.appendChild(input);
    } else {
      const input = document.createElement('input');
      const isPasswordField = key === 'password' || key === 'ownerPassword';
      input.type = isPasswordField ? 'password' : 'text';
      input.className = inputClass;
      input.value = currentValue;
      input.addEventListener('input', () => {
        (ctrl as { value: string }).value = input.value;
      });
      wrapper.appendChild(input);
    }

    if (controlHints[key]) {
      const hint = document.createElement('p');
      hint.className = 'text-xs ui-text-tertiary mt-1';
      const hintKey = hintI18nKeys[key];
      hint.textContent = hintKey
        ? translate(hintKey, controlHints[key])
        : controlHints[key];
      wrapper.appendChild(hint);
    }

    if (advancedControls.has(key)) {
      advancedWrappers.push(wrapper);
    } else {
      content.appendChild(wrapper);
    }
  }

  function applyConditionalVisibility(
    dropdownKey: string,
    selectedValue: string
  ) {
    const mapping = conditionalVisibility[dropdownKey];
    if (!mapping) return;
    const allControlled = new Set(Object.values(mapping).flat());
    for (const controlKey of allControlled) {
      const el = controlWrappers[controlKey];
      if (el) el.style.display = 'none';
    }
    const visible = mapping[selectedValue] ?? [];
    for (const controlKey of visible) {
      const el = controlWrappers[controlKey];
      if (el) el.style.display = '';
    }
  }

  for (const [dropdownKey] of Object.entries(conditionalVisibility)) {
    const ctrl = controlEntries.find(([k]) => k === dropdownKey)?.[1] as
      | { value?: unknown }
      | undefined;
    if (ctrl) {
      applyConditionalVisibility(dropdownKey, String(ctrl.value ?? ''));
    }
  }

  if (hasAdvanced && advancedWrappers.length > 0) {
    const details = document.createElement('details');
    details.className =
      'ui-bg-surface border ui-border-subtle rounded-lg p-2 mt-1';
    const summary = document.createElement('summary');
    summary.className =
      'text-xs font-medium ui-text-secondary cursor-pointer select-none flex items-center justify-between';
    const summaryText = document.createElement('span');
    summaryText.textContent = translate(
      'common.dynamic.b328ee239a',
      'Advanced Settings'
    );
    summary.appendChild(summaryText);
    const chevron = document.createElement('i');
    chevron.className =
      'ph ph-caret-down text-xs ui-text-tertiary transition-transform duration-200';
    summary.appendChild(chevron);
    details.addEventListener('toggle', () => {
      chevron.style.transform = details.open
        ? 'rotate(180deg)'
        : 'rotate(0deg)';
    });
    details.appendChild(summary);
    const advancedContent = document.createElement('div');
    advancedContent.className = 'mt-2 space-y-3';
    for (const w of advancedWrappers) {
      advancedContent.appendChild(w);
    }
    details.appendChild(advancedContent);
    content.appendChild(details);
  }
}

const controlLabelKeys: Record<string, string> = {
  pages: 'tools:pdfWorkflow.controlLabels.pages',
  whitelist: 'tools:pdfWorkflow.controlLabels.whitelist',
  afterPage: 'tools:pdfWorkflow.controlLabels.afterPage',
  x0: 'tools:pdfWorkflow.controlLabels.x0',
  y0: 'tools:pdfWorkflow.controlLabels.y0',
  x1: 'tools:pdfWorkflow.controlLabels.x1',
  y1: 'tools:pdfWorkflow.controlLabels.y1',
  retainPageLabels: 'tools:pdfWorkflow.controlLabels.retainPageLabels',
  password: 'tools:pdfWorkflow.controlLabels.password',
  ownerPassword: 'tools:pdfWorkflow.controlLabels.ownerPassword',
  userPassword: 'tools:pdfWorkflow.controlLabels.userPassword',
  format: 'tools:pdfWorkflow.controlLabels.format',
  position: 'tools:pdfWorkflow.controlLabels.position',
  orientation: 'tools:pdfWorkflow.controlLabels.orientation',
  pageSize: 'tools:pdfWorkflow.controlLabels.pageSize',
  targetSize: 'tools:pdfWorkflow.controlLabels.targetSize',
  fontFamily: 'tools:pdfWorkflow.controlLabels.fontFamily',
  numberFormat: 'tools:pdfWorkflow.controlLabels.numberFormat',
  angle: 'tools:pdfWorkflow.controlLabels.angle',
  resolution: 'tools:pdfWorkflow.controlLabels.resolution',
  language: 'tools:pdfWorkflow.controlLabels.language',
  gridMode: 'tools:pdfWorkflow.controlLabels.gridMode',
  scalingMode: 'tools:pdfWorkflow.controlLabels.scalingMode',
  compressionLevel: 'tools:pdfWorkflow.controlLabels.compressionLevel',
  processingDpi: 'tools:pdfWorkflow.controlLabels.processingDpi',
  imageFormat: 'tools:pdfWorkflow.controlLabels.imageFormat',
  rasterizeDpi: 'tools:pdfWorkflow.controlLabels.rasterizeDpi',
  horizontalGap: 'tools:pdfWorkflow.controlLabels.horizontalGap',
  verticalGap: 'tools:pdfWorkflow.controlLabels.verticalGap',
  title: 'tools:pdfWorkflow.controlLabels.title',
  author: 'tools:pdfWorkflow.controlLabels.author',
  subject: 'tools:pdfWorkflow.controlLabels.subject',
  keywords: 'tools:pdfWorkflow.controlLabels.keywords',
  creator: 'tools:pdfWorkflow.controlLabels.creator',
  producer: 'tools:pdfWorkflow.controlLabels.producer',
  watermarkText: 'tools:pdfWorkflow.controlLabels.watermarkText',
  watermarkImage: 'tools:pdfWorkflow.controlLabels.watermarkImage',
  opacity: 'tools:pdfWorkflow.controlLabels.opacity',
  rotation: 'tools:pdfWorkflow.controlLabels.rotation',
  scale: 'tools:pdfWorkflow.controlLabels.scale',
  margin: 'tools:pdfWorkflow.controlLabels.margin',
  stampText: 'tools:pdfWorkflow.controlLabels.stampText',
  customWidth: 'tools:pdfWorkflow.controlLabels.customWidth',
  customHeight: 'tools:pdfWorkflow.controlLabels.customHeight',
  borderWidth: 'tools:pdfWorkflow.controlLabels.borderWidth',
  borderColor: 'tools:pdfWorkflow.controlLabels.borderColor',
  backgroundColor: 'tools:pdfWorkflow.controlLabels.backgroundColor',
  fontColor: 'tools:pdfWorkflow.controlLabels.fontColor',
  fontSize: 'tools:pdfWorkflow.controlLabels.fontSize',
  color: 'tools:pdfWorkflow.controlLabels.color',
  fillColor: 'tools:pdfWorkflow.controlLabels.fillColor',
  separatorColor: 'tools:pdfWorkflow.controlLabels.separatorColor',
  overlay: 'tools:pdfWorkflow.controlLabels.overlay',
  qFactor: 'tools:pdfWorkflow.controlLabels.qFactor',
  skewThreshold: 'tools:pdfWorkflow.controlLabels.skewThreshold',
  grayscale: 'tools:pdfWorkflow.controlLabels.grayscale',
  border: 'tools:pdfWorkflow.controlLabels.border',
  margins: 'tools:pdfWorkflow.controlLabels.margins',
  separator: 'tools:pdfWorkflow.controlLabels.separator',
  sepia: 'tools:pdfWorkflow.controlLabels.sepia',
  includeCcBcc: 'tools:pdfWorkflow.controlLabels.includeCcBcc',
  includeAttachments: 'tools:pdfWorkflow.controlLabels.includeAttachments',
  binarize: 'tools:pdfWorkflow.controlLabels.binarize',
  preFlatten: 'tools:pdfWorkflow.controlLabels.preFlatten',
  flattenForms: 'tools:pdfWorkflow.controlLabels.flattenForms',
  removeMetadata: 'tools:pdfWorkflow.controlLabels.removeMetadata',
  removeAnnotations: 'tools:pdfWorkflow.controlLabels.removeAnnotations',
  removeJavascript: 'tools:pdfWorkflow.controlLabels.removeJavascript',
  removeEmbeddedFiles: 'tools:pdfWorkflow.controlLabels.removeEmbeddedFiles',
  removeLayers: 'tools:pdfWorkflow.controlLabels.removeLayers',
  removeLinks: 'tools:pdfWorkflow.controlLabels.removeLinks',
  removeStructureTree: 'tools:pdfWorkflow.controlLabels.removeStructureTree',
  removeMarkInfo: 'tools:pdfWorkflow.controlLabels.removeMarkInfo',
  removeFonts: 'tools:pdfWorkflow.controlLabels.removeFonts',
  subsetFonts: 'tools:pdfWorkflow.controlLabels.subsetFonts',
  convertToGrayscale: 'tools:pdfWorkflow.controlLabels.convertToGrayscale',
  removeThumbnails: 'tools:pdfWorkflow.controlLabels.removeThumbnails',
  redactMode: 'tools:pdfWorkflow.controlLabels.redactMode',
  direction: 'tools:pdfWorkflow.controlLabels.direction',
  pagesPerSheet: 'tools:pdfWorkflow.controlLabels.pagesPerSheet',
  customUnits: 'tools:pdfWorkflow.controlLabels.customUnits',
  blankPosition: 'tools:pdfWorkflow.controlLabels.blankPosition',
  paperSize: 'tools:pdfWorkflow.controlLabels.paperSize',
  level: 'tools:pdfWorkflow.controlLabels.level',
  algorithm: 'tools:pdfWorkflow.controlLabels.algorithm',
  text: 'tools:pdfWorkflow.controlLabels.text',
  replacement: 'tools:pdfWorkflow.controlLabels.replacement',
};

function formatLabel(key: string): string {
  const english = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
  const i18nKey = controlLabelKeys[key];
  return i18nKey ? translate(i18nKey, english) : english;
}
