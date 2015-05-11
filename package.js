Package.describe({
  name: 'mfactory:simple-schema-relations',
  version: '0.0.1',
  summary: 'Define relations with aldeed:simple-schema',
  git: 'https://github.com/mfactory/meteor-simple-schema-relations.git',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');

  api.use([
    'mongo',
    'check',
    'aldeed:simple-schema@1.3.3',
    'reywood:publish-composite@1.3.6',
    'dburles:mongo-collection-instances@0.3.3'
  ]);

  api.addFiles([
    'lib.js'
  ]);

  api.addFiles([
    'server.js'
  ], 'server');
});
