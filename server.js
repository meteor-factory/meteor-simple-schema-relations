Meteor.publishAndJoin = function (name, fn) {
  Meteor.publishComposite(name, function () {
    var cursor = fn.apply(this, Array.prototype.slice.call(arguments));
    return {
      find: function () {
        return cursor;
      },
      children: compositeSchemaChildrenArray(cursor, true)
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

function compositeSchemaChildrenArray (cursorOrCollection, isCursor) {
  var fields = isCursor
                ? getCursorJoins(cursorOrCollection)
                : getCollectionJoins(cursorOrCollection);
  var children = [];

  _.each(fields, function (field) {
    var compositeChildren = {};

    if (field.isArray) {
      compositeChildren.find = findManyById(field.collection, field.name);
    } else {
      compositeChildren.find = findOneById(field.collection, field.name);
    }

    compositeChildren.children = compositeSchemaChildrenArray(field.collection);
    children.push(compositeChildren);
  });

  return children;
}

