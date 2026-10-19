export interface AppModule {
  label: string;
  /** Route of the module; null while it is not developed yet. */
  path: string | null;
}

/**
 * First-level modules shown in the top bar, in order. To add a module, add an entry here;
 * entries without a path are shown disabled as "Próximamente".
 */
export const MODULES: readonly AppModule[] = [
  { label: 'Inicio', path: '/inicio' },
  { label: 'Grupos', path: null },
];
