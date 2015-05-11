Meteor.publishSchema = function (name, fn) {
  Meteor.publishComposite(name, function () {
    var cursor = fn.apply(this, Array.prototype.slice.call(arguments));
    return {
      find: function () {
        return cursor;
      },
      children: compositeSchemaChildrenArray(cursor)
    }
  });
};

var findOneById = function (collection, fieldName) {
  return function (doc) {
    return collection.find({ _id: doc[fieldName] }, { limit: 1 });
  };
};

var findManyById = function (collection, fieldName) {
  return function (doc) {
    if (! _.isArray(doc[fieldName])) {
      doc[fieldName] = [doc[fieldName]];
    }

    return collection.find({ _id: { $in: doc[fieldName] } });
  };
};

function compositeSchemaChildrenArray (cursor) {
  var fields = getCursorJoins(cursor);
  var children = [];

  _.each(fields, function (field) {
    if (field.isArray) {
      children.push({ find: findManyById(field.collection, field.name) });
    } else {
      children.push({ find: findOneById(field.collection, field.name) });
    }
  });

  return children;
}

