import { ApplicationInitStatus } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Auth } from './core/auth/auth';
import { appConfig } from './app.config';

describe('appConfig', () => {
  it('waits for the refresh response before the app is initialized', async () => {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
    const status = TestBed.inject(ApplicationInitStatus);
    const http = TestBed.inject(HttpTestingController);
    let done = false;
    void status.donePromise.then(() => (done = true));

    const req = http.expectOne('/api/auth/refresh');
    await Promise.resolve();
    expect(done).toBe(false);

    req.flush({
      accessToken: 't',
      expiresIn: 900,
      user: { id: 1, firstName: 'Ana', lastName: 'P', email: 'a@x.com', role: 'USER' },
    });
    await status.donePromise;

    expect(done).toBe(true);
    expect(TestBed.inject(Auth).user()?.firstName).toBe('Ana');
  });
});
