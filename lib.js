SimpleSchema.extendOptions({
  joinById: Match.Optional(Mongo.Collection)
});

var ssFieldIsArray = function (field) {
  return field && typeof field.type === 'function' &&
          _.isArray(field.type());
};

var ssFieldIsString = function (field) {
  return field && typeof field.type === 'function' &&
          _.isString(field.type());
};

getSimpleSchemaJoins = function (schema) {
  return _.reduce(schema, function (result, field, name) {
    var isArray = ssFieldIsArray(field) && (!! schema[name + '.$']);
    var isString = isArray
                    ? ssFieldIsString(schema[name + '.$'])
                    : ssFieldIsString(schema[name]);

    if (field.joinById && isString) {
      result.push({
        name: name,
        collection: field.joinById,
        isArray: ssFieldIsArray(field)
      });
    }
    return result;
  }, []);
};

getCollectionJoins = function (collection) {
  if (collection && collection._c2 && collection._c2._simpleSchema) {
    return getSimpleSchemaJoins(collection._c2._simpleSchema._schema);
  }
};

getCursorJoins = function (cursor) {
  var collection = Mongo.Collection.get(cursor._getCollectionName());
  return getCollectionJoins(collection);
};

getOmitFields = function (fields) {
  return _.reduce(fields, function (omit, include, field) {
    if (! include) {
      var arr = field.split('.');
      var rest = _.rest(arr);

      if (rest.length > 0) {
        if (! omit[arr[0]]) {
          omit[arr[0]] = {};
        }
        omit[arr[0]][rest.join('.')] = 0;
      }
    }
    return omit;
  }, {});
};

getCursorOmitFields = function (cursor) {
  var fields = Meteor.isClient
                ? cursor.fields
                : cursor._cursorDescription.options.fields;
  return getOmitFields(fields);
};

Mongo.Collection.prototype.findAndJoin = function (selector, options) {
  var cursor = this.find.apply(this, Array.prototype.slice.call(arguments));
  var fields = getCursorJoins(cursor);
  var omitFields = getCursorOmitFields(cursor);
  
  return cursor.map(function (doc) {
    _.each(fields, function (field) {
      var value = doc[field.name];
      var fields = omitFields[field.name];

      if (field.isArray) {
        if (! _.isArray(value)) {
          value = [value];
        }

        doc[field.name] = field.collection.findAndJoin(
                            { _id: { $in: value } },
                            { fields: fields });
      } else {
        var findOneResult = field.collection.findAndJoin(
                              { _id: value }, 
                              { limit: 1, fields: fields });
        if (findOneResult.length == 1) {
          doc[field.name] = findOneResult[0];
        }
      }
    });
    return doc;
  });
};