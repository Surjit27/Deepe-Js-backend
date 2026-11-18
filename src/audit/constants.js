export const AUDIT_DOMAIN = {
  USER: 'user',
  EMAIL: 'email',
  JOB: 'job',
}

export const AUDIT_ACTION = {
  LOGIN_SUCCESS: 'login.success',
  LOGIN_FAILED: 'login.failed',
  LOGOUT: 'logout',
  USER_CREATED: 'user.created',
  ROLE_CREATED: 'role.created',
  /** One row when the client tab successfully opens an impersonation session. */
  IMPERSONATION: 'impersonation',
  PERSONAL_SETTINGS_UPDATED: 'personal_settings.updated',
  EMAIL_SETTINGS_UPDATED: 'settings.updated',
  EMAIL_TEST_SENT: 'test.sent',
  EMAIL_TEST_FAILED: 'test.failed',
  JOB_TRIGGER_CREATED: 'trigger.created',
  JOB_TRIGGER_UPDATED: 'trigger.updated',
  JOB_TRIGGER_DELETED: 'trigger.deleted',
  JOB_TRIGGER_RUN_MANUAL: 'trigger.run.manual',
  JOB_EVENT_FIRED: 'trigger.run.event',
  JOB_RUN_SUCCESS: 'run.success',
  JOB_RUN_FAILED: 'run.failed',
  JOB_RUN_SKIPPED: 'run.skipped',
}
