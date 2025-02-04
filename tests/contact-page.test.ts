// Add type declaration for React DevTools hook
declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__: {
      renderers: Map<string, any>;
      supportsFiber: boolean;
      inject: (renderer: any) => void;
      onCommitFiberRoot: (id: string, root: any) => void;
      onCommitFiberUnmount: (id: string, root: any) => void;
    };
  }
}

import { test, expect } from '@playwright/test';

test('contact page loads correctly on mobile', async ({ page }) => {
  // Set a mobile viewport
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE dimensions

  // Create arrays to store console messages
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];

  // Listen to console messages and log them immediately
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      // console.error(`Browser Error: ${text}`);
    } else {
      consoleMessages.push(text);
      // console.log(`Browser Log: ${text}`);
    }
  });

  // Enable React DevTools
  await page.addInitScript(() => {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map(),
      supportsFiber: true,
      inject: (renderer) => {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.set('main', renderer);
      },
      onCommitFiberRoot: () => { },
      onCommitFiberUnmount: () => { },
    };
  });

  // Navigate to the contact page
  await page.goto('http://localhost:3001/contact/adela-reynolds?contact=adonis-windler&group=89a100a7-97ad-4af3-bbd3-f25862981d83');

  // Wait for key elements to be present
  await page.waitForSelector('[data-testid="back-button"]');

  // Log React component structure
  const componentInfo = await page.evaluate(() => {
    function getReactInstance(element: Element) {
      const keys = Object.keys(element);
      const fiberKey = keys.find(key => key.startsWith('__reactFiber$'));
      return fiberKey ? (element as any)[fiberKey] : null;
    }

    function getComponentName(fiber: any): string {
      try {
        const { type, elementType } = fiber;
        // Check for custom components first
        if (elementType?.displayName) return elementType.displayName;
        if (type?.displayName) return type.displayName;
        if (elementType?.name) return elementType.name;
        if (type?.name) return type.name;
        // Then check for HTML elements
        if (typeof type === 'string') return type;
        if (typeof elementType === 'string') return elementType;
        // For anonymous components, try to get something meaningful
        if (fiber.memoizedProps?.['data-testid']) return `Component(${fiber.memoizedProps['data-testid']})`;
        if (fiber.memoizedProps?.id) return `Component(#${fiber.memoizedProps.id})`;
        if (fiber.memoizedProps?.className) {
          const classes = fiber.memoizedProps.className.split(' ')[0];
          return `Component(.${classes})`;
        }
        return 'Unknown';
      } catch {
        return 'Unknown';
      }
    }

    function buildComponentTree(element: Element): any {
      const fiber = getReactInstance(element);
      if (!fiber) return null;

      const name = getComponentName(fiber);
      if (name === 'Unknown') return null;

      const info: any = {
        name,
        type: typeof fiber.type === 'string' ? 'html' : 'component',
        children: []
      };

      // Get props if available (excluding children and internal props)
      if (fiber.memoizedProps) {
        const { children, className, ...props } = fiber.memoizedProps;
        const filteredProps = Object.entries(props)
          .filter(([key]) => !key.startsWith('__') && !key.startsWith('aria-'))
          .reduce((acc, [key, value]) => {
            acc[key] = typeof value === 'function' ? 'function()' :
              typeof value === 'object' ? JSON.stringify(value) : value;
            return acc;
          }, {} as Record<string, any>);

        if (className) {
          filteredProps.className = className;
        }

        if (Object.keys(filteredProps).length > 0) {
          info.props = filteredProps;
        }
      }

      // Process children
      const childElements = Array.from(element.children);
      for (const child of childElements) {
        const childInfo = buildComponentTree(child);
        if (childInfo) {
          info.children.push(childInfo);
        }
      }

      return info;
    }

    // Start from the root and build tree
    const root = document.querySelector('#__next') || document.querySelector('[data-reactroot]') || document.body;
    return buildComponentTree(root);
  });

  // Format tree for better visualization
  function formatTree(node: any, level = 0): string {
    if (!node) return '';

    const indent = '  '.repeat(level);
    let props = '';

    // Skip SVG internals and basic HTML elements without important props
    const skipNode = (node.name === 'path' || node.name === 'line' || node.name === 'polyline' || node.name === 'rect' || node.name === 'circle');
    if (skipNode) return '';

    if (node.props) {
      const importantProps = ['className', 'data-testid', 'id', 'type', 'role', 'data-state'];
      const visibleProps = Object.entries(node.props)
        .filter(([key, value]) => {
          if (!importantProps.includes(key) && !key.startsWith('data-')) return false;
          // Skip long className strings
          if (key === 'className' && typeof value === 'string' && value.length > 50) {
            return false;
          }
          return true;
        })
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>);

      if (Object.keys(visibleProps).length > 0) {
        props = ` ${Object.entries(visibleProps)
          .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
          .join(' ')}`;
      }
    }

    // Skip nodes without props or children unless they're important
    const isImportant = node.name === 'button' || node.name === 'input' || node.name === 'textarea' ||
      node.name === 'select' || node.name === 'a' || node.props?.['data-testid'];
    if (!props && !isImportant && (!node.children || node.children.length === 0)) {
      return '';
    }

    const componentType = node.type === 'component' ? 'Component' : node.name;
    let result = `${indent}${componentType}${props}\n`;

    if (node.children && node.children.length > 0) {
      const childrenOutput = node.children
        .map((child: any) => formatTree(child, level + 1))
        .filter(Boolean)
        .join('');
      if (childrenOutput) {
        result += childrenOutput;
      }
    }

    return result;
  }

  console.log('React Component Tree:\n', formatTree(componentInfo));

  // Check if we found the contact (look for debug message in console)
  const foundContactMessage = consoleMessages.find(msg =>
    msg.includes('Debug - Found contact:') && msg.includes('adela-reynolds')
  );
  expect(foundContactMessage).toBeTruthy();

  // Log all errors if any were found
  if (consoleErrors.length > 0) {
    console.log('All browser errors:');
    consoleErrors.forEach(error => console.error(error));
  }

  // Check if there are no console errors
  expect(consoleErrors).toHaveLength(0);

  // Verify the contact name is displayed
  const contactName = await page.getByRole('heading', { name: /Adela Reynolds/i });
  await expect(contactName).toBeVisible();

  // Verify the back button is present (since we're on mobile)
  const backButton = await page.getByTestId('back-button');
  await expect(backButton).toBeVisible();
}); 