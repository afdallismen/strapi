'use strict';

module.exports = {
  kind: 'collectionType',
  collectionName: 'strapi_i18n_localizations',
  info: {
    name: 'Localization',
  },
  options: {
    increments: true,
  },
  attributes: {
    ref_id: {
      type: 'string',
    },
    ref_type: {
      type: 'string',
    },
    locale: {
      type: 'string',
    },
  },
};
