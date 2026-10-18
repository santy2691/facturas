import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatIconHarness } from '@angular/material/icon/testing';
import { FormAlert } from './form-alert';

describe('FormAlert', () => {
  let fixture: ComponentFixture<FormAlert>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormAlert] }).compileComponents();
    fixture = TestBed.createComponent(FormAlert);
    fixture.componentRef.setInput('message', 'Email o contraseña incorrectos');
    await fixture.whenStable();
  });

  it('renders the message inside an alert', () => {
    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Email o contraseña incorrectos');
  });

  it('shows the error icon', async () => {
    const icon = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatIconHarness);
    expect(await icon.getName()).toBe('error');
  });
});
