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

var findOneById = function (collection, fieldName, fields) {
  return function (doc) {
    return collection.find({ _id: doc[fieldName] }, { limit: 1, fields: fields });
  };
};

var findManyById = function (collection, fieldName, fields) {
  return function (doc) {
    if (! _.isArray(doc[fieldName])) {
      doc[fieldName] = [doc[fieldName]];
    }

    return collection.find({ _id: { $in: doc[fieldName] } }, { fields: fields });
  };
};

function compositeSchemaChildrenArray (cursorOrCollection, isCursor, cursorFields) {
  var joins = isCursor
                ? getCursorJoins(cursorOrCollection)
                : getCollectionJoins(cursorOrCollection);
  var children = [];

  if ((! cursorFields) && isCursor) {
    cursorFields = getCursorFields(cursorOrCollection);
  }

  _.each(joins, function (join) {
    var compositeChildren = {};
    var fields;

    if (cursorFields && cursorFields[join.field]) {
      fields = cursorFields[join.field];
    }

    if (join.isArray) {
      compositeChildren.find = findManyById(join.collection, join.field, fields);
    } else {
      compositeChildren.find = findOneById(join.collection, join.field, fields);
    }

    compositeChildren.children = compositeSchemaChildrenArray(
                                  join.collection, false, shiftFields(fields));
    children.push(compositeChildren);
  });

  return children;
}

