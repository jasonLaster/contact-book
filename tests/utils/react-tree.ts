// react-tree.ts

import { Page } from "@playwright/test";

// =============================================================================
// Interfaces and Types
// =============================================================================

export interface ReactDevToolsHook {
  renderers: Map<string, any>;
  supportsFiber: boolean;
  inject: (renderer: any) => void;
  onCommitFiberRoot: (id: string, root: any) => void;
  onCommitFiberUnmount: (id: string, root: any) => void;
}

export interface ComponentTreeNode {
  name: string;
  props?: Record<string, any>;
  children?: ComponentTreeNode[];
}

export interface ReactTreeUtils {
  getDisplayName: (fiber: any) => string;
  findReactRoot: () => any;
  getFiberNode: (dom: Element) => any;
  traverseFiberTree: (fiber: any, depth?: number, maxDepth?: number) => ComponentTreeNode | null;
  getReactTree: () => { root: ComponentTreeNode | null };
  extractComponentProps: (fiber: any) => Record<string, any>;
  formatComponentTree: (node: ComponentTreeNode, depth?: number) => string;
}

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__: ReactDevToolsHook;
    logFormattedReactTree: () => string;
  }
}

// =============================================================================
// Core Utility Functions (used both on the Node side and in the browser)
// =============================================================================

export function getDisplayName(fiber: any): string {
  if (!fiber) return 'Unknown';
  // Handle Context Providers
  if (fiber.type?._context?.displayName) {
    return `${fiber.type._context.displayName}.Provider`;
  }
  // Handle React provider (common in Next.js apps)
  if (fiber.type?.$$typeof === Symbol.for('react.provider')) {
    const contextName = fiber.type._context?.displayName || 'Unknown';
    return `${contextName}.Provider`;
  }
  // Handle Next.js internal components based on pendingProps
  if (fiber.pendingProps) {
    if (fiber.pendingProps.initialHead) return 'HeadManagerContext.Provider';
    if (fiber.pendingProps.buildId) return 'GlobalLayoutRouterContext.Provider';
    if (fiber.pendingProps.tree) return 'AppRouter';
    if (fiber.pendingProps.parallelRouterKey) return 'ParallelRouter';
    if (fiber.pendingProps.segment) return 'LayoutRouter';
    if (fiber.pendingProps.template) return 'TemplateContext.Provider';
    if (fiber.pendingProps.pathname !== undefined) return 'PathnameContext.Provider';
    if (fiber.pendingProps.searchParams !== undefined) return 'SearchParamsContext.Provider';
  }
  return fiber.type?.displayName ||
    fiber.type?.name ||
    (typeof fiber.type === 'string' ? fiber.type : 'Unknown');
}

export function extractComponentProps(fiber: any): Record<string, any> {
  const props: Record<string, any> = {};
  if (fiber.key) {
    props.key = fiber.key;
  }
  const memoizedProps = fiber.memoizedProps || {};
  const pendingProps = fiber.pendingProps || {};
  const allProps = { ...memoizedProps, ...pendingProps };
  const relevantProps = [
    'pathname',
    'segment',
    'parallelRouterKey',
    'lang',
    'href',
    'rel',
    'precedence',
    'buildId',
    'initialHead',
    'template',
    'tree',
    'headManager',
    'searchParams'
  ];
  for (const key of relevantProps) {
    if (allProps[key] !== undefined) {
      props[key] = allProps[key];
    }
  }
  return props;
}

export function traverseFiberTree(fiber: any, depth = 0, maxDepth = 100): ComponentTreeNode | null {
  if (!fiber || depth > maxDepth) return null;
  const name = getDisplayName(fiber);
  const props = extractComponentProps(fiber);
  const node: ComponentTreeNode = { name };
  if (Object.keys(props).length > 0) {
    node.props = props;
  }
  const children: ComponentTreeNode[] = [];
  let child = fiber.child;
  while (child) {
    const childNode = traverseFiberTree(child, depth + 1, maxDepth);
    if (childNode) {
      children.push(childNode);
    }
    child = child.sibling;
  }
  if (children.length > 0) {
    node.children = children;
  }
  return node;
}

export function getFiberNode(dom: Element): any {
  for (const key in dom) {
    if (key.startsWith('__reactFiber$')) {
      return (dom as any)[key];
    }
  }
  return null;
}

export function findReactRoot(): any {
  const container = document.getElementById('__next') || document.body;
  const fiber = getFiberNode(container);
  return fiber ? fiber.child : null;
}

export function getReactTree(): { root: ComponentTreeNode | null } {
  const rootFiber = findReactRoot();
  if (!rootFiber) return { root: null };
  const tree = traverseFiberTree(rootFiber);
  return { root: tree };
}

export function formatComponentTree(node: ComponentTreeNode, depth = 0): string {
  const indent = '  '.repeat(depth);
  const propsStr = node.props ? ` ${JSON.stringify(node.props)}` : '';
  let output = `${indent}${node.name}:${propsStr}`;
  if (node.children) {
    for (const child of node.children) {
      output += `\n${formatComponentTree(child, depth + 1)}`;
    }
  }
  return output;
}

// =============================================================================
// Initialization Functions (for external use)
// =============================================================================

export function initializeReactDevTools(): ReactDevToolsHook {
  return {
    renderers: new Map(),
    supportsFiber: true,
    inject: (renderer) => {
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.set('main', renderer);
    },
    onCommitFiberRoot: () => { },
    onCommitFiberUnmount: () => { }
  };
}

export function initializeReactTreeUtils(): ReactTreeUtils {
  return {
    getDisplayName,
    findReactRoot,
    getFiberNode,
    traverseFiberTree,
    getReactTree,
    extractComponentProps,
    formatComponentTree
  };
}

// =============================================================================
// Injection Function for Playwright Evaluation
// =============================================================================

/**
 * A plain JavaScript function that sets up the React DevTools hook and attaches
 * the React tree utilities to window. This function can be passed directly to
 * page.evaluate() in Playwright.
 */
export function injectReactTreeUtilsInPage(): void {
  // Set up the React DevTools hook on window.
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(),
    supportsFiber: true,
    inject: (renderer: any) => {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.set('main', renderer);
    },
    onCommitFiberRoot: () => { },
    onCommitFiberUnmount: () => { }
  };

  // Define utility functions within this function's closure.
  function getDisplayNameJS(fiber: any): string {
    if (!fiber) return 'Unknown';
    if (fiber.type && fiber.type._context && fiber.type._context.displayName) {
      return `${fiber.type._context.displayName}.Provider`;
    }
    if (fiber.type && fiber.type.$$typeof === Symbol.for('react.provider')) {
      const contextName = fiber.type._context?.displayName || 'Unknown';
      return `${contextName}.Provider`;
    }
    if (fiber.pendingProps) {
      if (fiber.pendingProps.initialHead) return 'HeadManagerContext.Provider';
      if (fiber.pendingProps.buildId) return 'GlobalLayoutRouterContext.Provider';
      if (fiber.pendingProps.tree) return 'AppRouter';
      if (fiber.pendingProps.parallelRouterKey) return 'ParallelRouter';
      if (fiber.pendingProps.segment) return 'LayoutRouter';
      if (fiber.pendingProps.template) return 'TemplateContext.Provider';
      if (fiber.pendingProps.pathname !== undefined) return 'PathnameContext.Provider';
      if (fiber.pendingProps.searchParams !== undefined) return 'SearchParamsContext.Provider';
    }
    return fiber.type?.displayName ||
      fiber.type?.name ||
      (typeof fiber.type === 'string' ? fiber.type : 'Unknown');
  }

  function extractComponentPropsJS(fiber: any): Record<string, any> {
    const props: Record<string, any> = {};
    if (fiber.key) {
      props.key = fiber.key;
    }
    const memoizedProps = fiber.memoizedProps || {};
    const pendingProps = fiber.pendingProps || {};
    const allProps = { ...memoizedProps, ...pendingProps };
    const relevantProps = [
      'pathname',
      'segment',
      'parallelRouterKey',
      'lang',
      'href',
      'rel',
      'precedence',
      'buildId',
      'initialHead',
      'template',
      'tree',
      'headManager',
      'searchParams'
    ];
    for (const key of relevantProps) {
      if (allProps[key] !== undefined) {
        props[key] = allProps[key];
      }
    }
    return props;
  }

  function traverseFiberTreeJS(fiber: any, depth = 0, maxDepth = 100): ComponentTreeNode | null {
    if (!fiber || depth > maxDepth) return null;
    const name = getDisplayNameJS(fiber);
    const props = extractComponentPropsJS(fiber);
    const node: ComponentTreeNode = { name };
    if (Object.keys(props).length > 0) {
      node.props = props;
    }
    const children: ComponentTreeNode[] = [];
    let child = fiber.child;
    while (child) {
      const childNode = traverseFiberTreeJS(child, depth + 1, maxDepth);
      if (childNode) {
        children.push(childNode);
      }
      child = child.sibling;
    }
    if (children.length > 0) {
      node.children = children;
    }
    return node;
  }

  function getFiberNodeJS(dom: Element): any {
    for (const key in dom) {
      if (key.startsWith('__reactFiber$')) {
        return (dom as any)[key];
      }
    }
    return null;
  }

  function findReactRootJS(): any {
    const container = document.getElementById('__next') || document.body;
    const fiber = getFiberNodeJS(container);
    return fiber ? fiber.child : null;
  }

  function getReactTreeJS(): { root: ComponentTreeNode | null } {
    const rootFiber = findReactRootJS();
    if (!rootFiber) return { root: null };
    const tree = traverseFiberTreeJS(rootFiber);
    return { root: tree };
  }

  function formatComponentTreeJS(node: ComponentTreeNode, depth = 0): string {
    const indent = '  '.repeat(depth);
    const propsStr = node.props ? ` ${JSON.stringify(node.props)}` : '';
    let output = `${indent}${node.name}:${propsStr}`;
    if (node.children) {
      for (const child of node.children) {
        output += `\n${formatComponentTreeJS(child, depth + 1)}`;
      }
    }
    return output;
  }

  // Attach the utilities to window for later access.
  (window as any).utils = {
    getDisplayName: getDisplayNameJS,
    extractComponentProps: extractComponentPropsJS,
    traverseFiberTree: traverseFiberTreeJS,
    getFiberNode: getFiberNodeJS,
    findReactRoot: findReactRootJS,
    getReactTree: getReactTreeJS,
    formatComponentTree: formatComponentTreeJS,
  };

  // Add a helper to get a formatted tree string.
  (window as any).logFormattedReactTree = () => {
    const tree = getReactTreeJS();
    if (!tree || !tree.root) return 'No React tree found';
    return formatComponentTreeJS(tree.root);
  };
}


export async function logFormattedReactTree(page: Page): Promise<void> {
  // Log React component structure
  const treeOutput = await page.evaluate(() => {
    return window.logFormattedReactTree();
  });

  console.log('React Component Tree:');
  console.log(treeOutput);
}