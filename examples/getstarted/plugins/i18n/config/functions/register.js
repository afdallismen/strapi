'use strict';

const _ = require('lodash');

// add a register function to do some stuff after the loading but before the boot
module.exports = () => {
  // need to add some logic to the db layer so we can add fields to the models

  Object.values(strapi.models).forEach(model => {
    if (_.get(model, 'pluginOptions.i18n.enabled', false) === true) {
      _.set(model.attributes, '_localizations', {
        writable: true,
        private: false,
        configurable: false,
        collection: 'localization',
        plugin: 'i18n',
      });

      _.set(model.attributes, 'locale', {
        writable: true,
        private: false,
        configurable: false,
        type: 'string',
      });

      // _.set(model.attributes, '_localizations', {
      //   writable: false,
      //   configurable: false,
      //   collection: model.modelName,
      // });
    }
  });

  // strapi.database.migrations.push({
  //   before() {},
  //   after() {},
  // });
};
