import { FormControl } from '@angular/forms';
import {
  UserCreateRequest,
  UserUpdateRequest,
} from 'picsur-shared/dist/dto/api/user-manage.dto';
import {
  CreateEmailError,
  CreatePasswordError,
  CreateUsernameError,
  EmailValidators,
  PasswordValidators,
  UsernameValidators,
} from '../validators/user.validator';

export class UpdateUserControl {
  private id = '';
  public username = new FormControl('', UsernameValidators);
  public email = new FormControl('', [...EmailValidators]);
  public password = new FormControl('', PasswordValidators);
  public roles = new FormControl<string[]>([]);

  public get usernameValue() {
    return this.username.value;
  }

  public get usernameError() {
    return CreateUsernameError(this.username.errors);
  }

  public get emailError() {
    return CreateEmailError(this.email.errors);
  }

  public get passwordError() {
    return CreatePasswordError(this.password.errors);
  }

  public get selectedRoles(): string[] {
    return this.roles.value ?? [];
  }

  // Data interaction

  public putId(id: string) {
    this.id = id;
  }

  public putUsername(username: string) {
    this.username.setValue(username);
  }

  public putEmail(email: string | undefined) {
    this.email.setValue(email ?? null);
  }

  public putRoles(roles: string[]) {
    this.roles.setValue(roles);
  }

  public getDataCreate(): UserCreateRequest {
    return {
      username: this.username.value ?? '',
      password: this.password.value ?? '',
      roles: this.selectedRoles,
      ...(this.email.value && { email: this.email.value }),
    };
  }

  public getDataUpdate(): UserUpdateRequest {
    return {
      ...this.getDataCreate(),
      id: this.id,
    };
  }
}
