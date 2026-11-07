UPDATE feature_flags SET
  label = 'Backends',
  description = 'Reverse engineering workspace (overview, registry, tools)',
  nav_path = '/backends/overview'
WHERE key = 'client.backends';

UPDATE feature_flags SET nav_path = '/backends/events' WHERE key = 'client.scheduler';
UPDATE feature_flags SET nav_path = '/backends/mocks' WHERE key = 'client.mocks';
UPDATE feature_flags SET nav_path = '/backends/injection' WHERE key = 'client.injection';
UPDATE feature_flags SET nav_path = '/backends/monitor' WHERE key = 'client.monitor';
UPDATE feature_flags SET nav_path = '/backends/git' WHERE key = 'client.git';
UPDATE feature_flags SET nav_path = '/backends/assistant' WHERE key = 'client.assistant';
