import { get, has, isEqual, omit, sortBy, camelCase } from 'lodash';

import pluginId from '../../../pluginId';
import makeUnique from '../../../utils/makeUnique';

const getCreatedAndModifiedComponents = (allComponents, initialComponents) => {
  const componentUIDsToReturn = Object.keys(allComponents).filter(compoUid => {
    const currentCompo = get(allComponents, compoUid, {});
    const initialCompo = get(initialComponents, compoUid, {});
    const hasComponentBeenCreated = get(currentCompo, ['isTemporary'], false);
    const hasComponentBeenModified = !isEqual(currentCompo, initialCompo);

    return hasComponentBeenCreated || hasComponentBeenModified;
  });

  return makeUnique(componentUIDsToReturn);
};

const formatComponent = (component, mainDataUID, isCreatingData = false) => {
  const formattedAttributes = formatAttributes(
    get(component, 'schema.attributes', {}),
    mainDataUID,
    isCreatingData,
    true
  );

  // Set tmpUID if the component has just been created
  // Keep the uid if the component already exists
  const compoUID = get(component, 'isTemporary', false)
    ? { tmpUID: component.uid }
    : { uid: component.uid };

  const formattedComponent = Object.assign(
    {},
    compoUID,
    { category: component.category },
    // Omit the attributes since we want to format them
    omit(component.schema, 'attributes'),
    // Add the formatted attributes
    { attributes: formattedAttributes }
  );

  return formattedComponent;
};

const formatMainDataType = (data, isComponent = false) => {
  const isCreatingData = get(data, 'isTemporary', false);
  const mainDataUID = get(data, 'uid', null);

  const formattedAttributes = formatAttributes(
    get(data, 'schema.attributes', {}),
    mainDataUID,
    isCreatingData,
    false
  );
  const initObj = isComponent ? { category: get(data, 'category', '') } : {};

  const formattedContentType = Object.assign(initObj, omit(data.schema, 'attributes'), {
    attributes: formattedAttributes,
  });

  delete formattedContentType.uid;
  delete formattedContentType.isTemporary;
  delete formattedContentType.editable;
  delete formattedContentType.restrictRelationsTo;

  return formattedContentType;
};

/**
 *
 * @param {Object} attributes
 * @param {String} mainDataUID uid of the main data type
 * @param {Boolean} isCreatingMainData
 * @param {Boolean} isComponent
 */
const formatAttributes = (attributes, mainDataUID, isCreatingMainData, isComponent) => {
  return Object.keys(attributes).reduce((acc, current) => {
    const currentAttribute = get(attributes, current, {});
    const hasARelationWithMainDataUID = currentAttribute.target === mainDataUID;
    const isRelationType = has(currentAttribute, 'nature');
    const currentTargetAttribute = get(currentAttribute, 'targetAttribute', null);

    if (!hasARelationWithMainDataUID) {
      if (isRelationType) {
        const relationAttr = Object.assign({}, currentAttribute, {
          targetAttribute: formatRelationTargetAttribute(currentTargetAttribute),
        });

        acc[current] = removeNullKeys(relationAttr);
      } else {
        acc[current] = removeNullKeys(currentAttribute);
      }
    }

    if (hasARelationWithMainDataUID) {
      let target = currentAttribute.target;

      if (isCreatingMainData) {
        target = isComponent ? '__contentType__' : '__self__';
      }

      const formattedRelationAttribute = Object.assign({}, currentAttribute, {
        target,
        targetAttribute: formatRelationTargetAttribute(currentTargetAttribute),
      });

      acc[current] = removeNullKeys(formattedRelationAttribute);
    }

    return acc;
  }, {});
};

const formatRelationTargetAttribute = targetAttribute =>
  targetAttribute === '-' ? null : targetAttribute;

const removeNullKeys = obj =>
  Object.keys(obj).reduce((acc, current) => {
    if (obj[current] !== null && current !== 'plugin') {
      acc[current] = obj[current];
    }

    return acc;
  }, {});

const getComponentsToPost = (
  allComponents,
  initialComponents,
  mainDataUID,
  isCreatingData = false
) => {
  const componentsToFormat = getCreatedAndModifiedComponents(allComponents, initialComponents);
  const formattedComponents = componentsToFormat.map(compoUID => {
    const currentCompo = get(allComponents, compoUID, {});
    const formattedComponent = formatComponent(currentCompo, mainDataUID, isCreatingData);

    return formattedComponent;
  });

  return formattedComponents;
};

const sortContentType = types =>
  sortBy(
    Object.keys(types)
      .map(uid => ({
        editable: types[uid].schema.editable,
        name: uid,
        title: types[uid].schema.name,
        plugin: types[uid].plugin || null,
        uid,
        to: `/plugins/${pluginId}/content-types/${uid}`,
        kind: types[uid].schema.kind,
        restrictRelationsTo: types[uid].schema.restrictRelationsTo,
      }))
      .filter(obj => obj !== null),
    obj => camelCase(obj.title)
  );

const collectionTypeFactory = getField => obj => {
  const attributes = Object.keys(obj.attributes).reduce((acc, current) => {
    const attribute = get(obj, ['attributes', current]);
    const type = get(attribute, 'type', 'text');
    const inputType = has(getField(type), 'collectionType') ? type : null;
    const collectionType = get(getField(type), 'collectionType');

    acc[current] =
      inputType && collectionType
        ? Object.assign({}, attribute, {
          inputType,
          type: collectionType || 'text',
        })
        : attribute;

    return acc;
  }, {});

  return Object.assign({}, obj, { attributes });
};

/**
 * @description Body mapper for custom fields. If the field is registered in the Field API, we need to
 * - update the `type` property to an acceptable value (default to 'text')
 * - create the `inputType` property to store the custom field type
 * @param {Object} body Payload to send to the API
 * @param {Object} fieldApi (Field API)[packages/strapi-admin/admin/src/utils/FieldApi.js] provided by Strapi
 * @returns {Object} A body with modified `type` property + new `inputType` property if needed
 */
const mapCustomInputTypesToCollectionTypes = (body, { getField }) => {
  const addCollectionType = collectionTypeFactory(getField);

  return Object.keys(body).reduce((acc, current) => {
    if (Array.isArray(body[current])) {
      acc[current] = body[current].map(addCollectionType);
    } else {
      acc[current] = addCollectionType(body[current]);
    }

    return acc;
  }, {});
};

export {
  formatComponent,
  getComponentsToPost,
  getCreatedAndModifiedComponents,
  formatMainDataType,
  sortContentType,
  mapCustomInputTypesToCollectionTypes,
};
