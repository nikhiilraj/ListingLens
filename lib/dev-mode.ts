export function isDevMode(): boolean {
  return process.env.DEV_MODE === 'true';
}
