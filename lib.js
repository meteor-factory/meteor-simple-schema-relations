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

    if (field.findById && isString) {
      result.push({
        name: name,
        collection: field.findById,
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
}

getCursorJoins = function (cursor) {
  var collection = Mongo.Collection.get(cursor._getCollectionName());
  return getCollectionJoins(collection);
};

Mongo.Collection.prototype.findAndJoin = function (selector, options) {
  var cursor = this.find.apply(this, Array.prototype.slice.call(arguments));
  var fields = getCursorJoins(cursor);
  
  return cursor.map(function (doc) {
    _.each(fields, function (field) {
      var value = doc[field.name];

      if (field.isArray) {
        if (! _.isArray(value)) {
          value = [value];
        }

        doc[field.name] = field.collection.findAndJoin(
                            { _id: { $in: value } }).fetch();
      } else {
        var findOneResult = field.collection.findAndJoin({ _id: value }, { limit: 1 });
        if (findOneResult.length == 1) {
          doc[field.name] = findOneResult[0];
        }
      }
    });
    return doc;
  });
};