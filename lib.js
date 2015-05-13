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
        field: name,
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

shiftFields = function (fields) {
  return _.reduce(fields, function (fields, value, field) {
    if (typeof field === 'string') {
      var arr = field.split('.');
      var rest = _.rest(arr);

      if (rest.length > 0) {
        if (! fields[arr[0]]) {
          fields[arr[0]] = {};
        }
        fields[arr[0]][rest.join('.')] = value;
      }
    }
    return fields;
  }, {});
};

getCursorFields = function (cursor) {
  var fields = Meteor.isClient
                ? cursor.fields
                : cursor._cursorDescription.options.fields;
  return shiftFields(fields);
};

Mongo.Collection.prototype.findAndJoin = function (selector, options) {
  var cursor = this.find.apply(this, Array.prototype.slice.call(arguments));
  var joins = getCursorJoins(cursor);
  var cursorFields = getCursorFields(cursor);

  return cursor.map(function (doc) {
    _.each(joins, function (join) {
      var value = doc[join.field];
      var fields = cursorFields[join.field];

      if (fields && (fields['^'] === 0 || fields['^'] === false)) {
        return doc;
      }

      if (join.isArray) {
        if (! _.isArray(value)) {
          value = [value];
        }

        doc[join.field] = join.collection.findAndJoin(
                            { _id: { $in: value } },
                            { fields: fields });
      } else {
        var findOneResult = join.collection.findAndJoin(
                              { _id: value }, 
                              { limit: 1, fields: fields });
        if (findOneResult.length == 1) {
          doc[join.field] = findOneResult[0];
        }
      }
    });
    return doc;
  });
};