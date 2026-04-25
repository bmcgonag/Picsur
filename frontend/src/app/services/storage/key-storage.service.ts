import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class KeyStorageService {
  private key: string | null = null;

  constructor() {
    this.load();
  }

  private load() {
    this.key = localStorage.getItem('apiKey');
  }

  private store() {
    if (this.key) localStorage.setItem('apiKey', this.key);
    else localStorage.removeItem('apiKey');
  }

  public get() {
    if (!this.key) {
      this.load();
    }
    return this.key;
  }

  public set(key: string) {
    console.log(
      'KeyStorageService.set called with:',
      key?.substring(0, 20) + '...',
    );
    this.key = key;
    this.store();
    console.log(
      'Key stored, localStorage:',
      localStorage.getItem('apiKey')?.substring(0, 20) + '...',
    );
  }

  public clear() {
    this.key = null;
    this.store();
  }
}
