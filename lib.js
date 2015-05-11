SimpleSchema.extendOptions({
  findById: Match.Optional(Mongo.Collection)
});

var ssFieldIsArray = function (field) {
  return field && typeof field.type === 'function' &&
          _.isArray(field.type());
};

var ssFieldIsString = function (field) {
  return field && typeof field.type === 'function' &&
          _.isString(field.type());
};

getCursorJoins = function (cursor) {
  var collection = Mongo.Collection.get(cursor._getCollectionName());
  var schema = collection._c2._simpleSchema._schema;

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

var findOneById = function (collection, fieldName) {
  return collection.findOne({ _id: doc[fieldName] });
};

var findManyById = function (collection, fieldName) {
  return collection.find({ _id: { $in: doc[fieldName] } }).fetch();
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

        doc[field.name] = field.collection.find(
                            { _id: { $in: value } }).fetch();
      } else {
        doc[field.name] = field.collection.findOne({ _id: value });
      }
    });
    return doc;
  });
};