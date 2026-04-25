import { z } from 'zod';
import { URLRegex } from '../util/common-regex.js';
import { IsEntityID } from '../validators/entity-id.validator.js';
import { IsValidMS } from '../validators/ms.validator.js';
import { IsPosInt } from '../validators/positive-int.validator.js';
import { PrefValueTypeStrings } from './preferences.dto.js';

// This enum is only here to make accessing the values easier, and type checking in the backend
export enum SysPreference {
  HostOverride = 'host_override',

  JwtSecret = 'jwt_secret',
  JwtExpiresIn = 'jwt_expires_in',
  BCryptStrength = 'bcrypt_strength',

  RemoveDerivativesAfter = 'remove_derivatives_after',
  AllowEditing = 'allow_editing',

  ConversionTimeLimit = 'conversion_time_limit',
  ConversionMemoryLimit = 'conversion_memory_limit',

  EnableTracking = 'enable_tracking',
  TrackingUrl = 'tracking_url',
  TrackingId = 'tracking_id',

  EnableTelemetry = 'enable_telemetry',

  RegistrationEnabled = 'registration_enabled',

  OidcEnabled = 'oidc_enabled',
  OidcIssuer = 'oidc_issuer',
  OidcClientId = 'oidc_client_id',
  OidcClientSecret = 'oidc_client_secret',
  OidcAutoLinkByEmail = 'oidc_auto_link_by_email',
  OidcProviderName = 'oidc_provider_name',
  DisableBuiltinAuth = 'disable_builtin_auth',
}

export type SysPreferences = SysPreference[];
export const SysPreferenceList: string[] = Object.values(SysPreference);

// Syspref Value types
export const SysPreferenceValueTypes: {
  [key in SysPreference]: PrefValueTypeStrings;
} = {
  [SysPreference.HostOverride]: 'string',

  [SysPreference.JwtSecret]: 'string',
  [SysPreference.JwtExpiresIn]: 'string',
  [SysPreference.BCryptStrength]: 'number',

  [SysPreference.RemoveDerivativesAfter]: 'string',
  [SysPreference.AllowEditing]: 'boolean',

  [SysPreference.ConversionTimeLimit]: 'string',
  [SysPreference.ConversionMemoryLimit]: 'number',

  [SysPreference.EnableTracking]: 'boolean',
  [SysPreference.TrackingUrl]: 'string',
  [SysPreference.TrackingId]: 'string',

  [SysPreference.EnableTelemetry]: 'boolean',

  [SysPreference.RegistrationEnabled]: 'boolean',

  [SysPreference.OidcEnabled]: 'boolean',
  [SysPreference.OidcIssuer]: 'string',
  [SysPreference.OidcClientId]: 'string',
  [SysPreference.OidcClientSecret]: 'string',
  [SysPreference.OidcAutoLinkByEmail]: 'boolean',
  [SysPreference.OidcProviderName]: 'string',
  [SysPreference.DisableBuiltinAuth]: 'boolean',
};

export const SysPreferenceValidators: {
  [key in SysPreference]: z.ZodTypeAny;
} = {
  [SysPreference.HostOverride]: z.string().regex(URLRegex).or(z.literal('')),

  [SysPreference.JwtSecret]: z.string(),
  [SysPreference.JwtExpiresIn]: IsValidMS(),

  [SysPreference.BCryptStrength]: IsPosInt(),
  [SysPreference.RemoveDerivativesAfter]: IsValidMS(60000),

  [SysPreference.AllowEditing]: z.boolean(),
  [SysPreference.ConversionTimeLimit]: IsValidMS(),
  [SysPreference.ConversionMemoryLimit]: IsPosInt(),

  [SysPreference.EnableTracking]: z.boolean(),
  [SysPreference.TrackingUrl]: z.string().regex(URLRegex).or(z.literal('')),
  [SysPreference.TrackingId]: IsEntityID().or(z.literal('')),

  [SysPreference.EnableTelemetry]: z.boolean(),

  [SysPreference.RegistrationEnabled]: z.boolean(),

  [SysPreference.OidcEnabled]: z.boolean(),
  [SysPreference.OidcIssuer]: z.string().url().or(z.literal('')),
  [SysPreference.OidcClientId]: z.string(),
  [SysPreference.OidcClientSecret]: z.string(),
  [SysPreference.OidcAutoLinkByEmail]: z.boolean(),
  [SysPreference.OidcProviderName]: z.string().max(50),
  [SysPreference.DisableBuiltinAuth]: z.boolean(),
};
