import type { VisualFramework } from './types';

/**
 * Central registry of bespoke Visual Frameworks.
 * Frameworks are registered here and discovered by the Studio environment.
 */
class FrameworkRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private frameworks = new Map<string, VisualFramework<any, any>>();

  public register<TData, TConfig>(framework: VisualFramework<TData, TConfig>): void {
    this.frameworks.set(framework.id, framework);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public get(id: string): VisualFramework<any, any> | undefined {
    return this.frameworks.get(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public list(): VisualFramework<any, any>[] {
    return Array.from(this.frameworks.values());
  }
}

export const frameworkRegistry = new FrameworkRegistry();
