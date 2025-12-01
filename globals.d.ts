/* global types for editor / TS server only */
declare var bcrypt: any;
declare var grecaptcha: any;
declare function initMobileNav(): void;
declare function createUserSession(email: string): any;
declare function showNotification(message: string, timeout?: number): void;
declare function addToCart(...args: any[]): any;

interface Window {
  initMobileNav?: any;
  createUserSession?: any;
  showNotification?: any;
  addToCart?: any;
}
