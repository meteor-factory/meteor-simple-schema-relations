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

function compositeSchemaChildrenArray (cursorOrCollection, isCursor, omitFields) {
  var fields = isCursor
                ? getCursorJoins(cursorOrCollection)
                : getCollectionJoins(cursorOrCollection);
  var children = [];

  if ((! omitFields) && isCursor) {
    omitFields = getCursorOmitFields(cursorOrCollection);
  }

  _.each(fields, function (field) {
    var compositeChildren = {};
    var fields;

    if (omitFields && omitFields[field.name]) {
      fields = omitFields[field.name];
    }

    if (field.isArray) {
      compositeChildren.find = findManyById(field.collection, field.name, fields);
    } else {
      compositeChildren.find = findOneById(field.collection, field.name, fields);
    }

    compositeChildren.children = compositeSchemaChildrenArray(
                                  field.collection, false, getOmitFields(fields));
    children.push(compositeChildren);
  });

  return children;
}

