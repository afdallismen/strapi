'use strict';

module.exports = {
  kind: 'collectionType',
  collectionName: 'strapi_roots',
  info: {
    name: 'Root',
  },
  options: {
    increments: true,
  },
  attributes: {
    main_id: {
      type: 'string',
    },
    main_type: {
      type: 'string',
    },
  },
};
