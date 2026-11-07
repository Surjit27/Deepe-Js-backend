-- Align feature-flag nav paths with current client portal routes (Deep Backend, History, Git).

UPDATE feature_flags SET nav_path = '/dashboard' WHERE key = 'client.backends';
UPDATE feature_flags SET nav_path = '/deep/scheduler' WHERE key = 'client.scheduler';
UPDATE feature_flags SET nav_path = '/deep/executions' WHERE key = 'client.monitor';
UPDATE feature_flags SET nav_path = '/integrations/github' WHERE key = 'client.git';
UPDATE feature_flags SET nav_path = '/jobs' WHERE key = 'client.scheduler';
UPDATE feature_flags SET nav_path = '/settings' WHERE key = 'client.settings';
UPDATE feature_flags SET nav_path = '/access/roles' WHERE key = 'client.account';
