SimpleSchema Relations
======================

This package aims to provide an easy way to define relations between different collections by utilizing `aldeed:simple-schema` and `reywood:publish-composite`.

WARNING: This is proof of concept and haven't been tested on production yet.

## Installation ##

At the moment you can install the package by cloning the repo to local `packages` folder and then running `meteor add mfactory:simple-schema-relations`. The package isn't published on Atmosphere yet.

## Usage ##

You can define one-to-one and one-to-many relations using `joinById` property in your schema, e.g.:

```
Posts = new Mongo.Collection('Posts');

PostsSchema = new SimpleSchema({
  title: {
    type: String
  },

  content: {
    type: String
  },

  owner: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    autoValue: function () {
      if (this.isInsert) {
        return Meteor.userId();
      }
    },

    joinById: Meteor.users
  },

  collaborators: {
    type: [String],
    regEx: SimpleSchema.RegEx.Id,

    joinById: Meteor.users
  }
})
```

That defined schema can be used to publish data from the server with `Meteor.publishAndJoin`, e.g:

```
Meteor.publishAndJoin('myPosts', function () {
  return Posts.find({ owner: this.userId });
});
```

When you subscribe to this publication `owner` and `collaborators` documents will be automatically published by searching `Meteor.users` collection with `_id` field. If you don't want to publish some fields (like collabolators in following example), you can do it same way as with "ordinary" meteor publication, e.g:

```
Meteor.publishAndJoin('myPosts', function () {
  return Posts.find({ owner: this.userId }, { fields: { collabolators: 0 } });
});
```

On the client you can use `Collection.findAndJoin` method which will join the different documents into one, e.g (assuming that you subscribed to `myPosts` before):

```
var myPosts = Posts.findAndJoin({ owner: Meteor.userId() });
// [
//    {
//        title: "Hello World",
//        owner: {
//            _id: "4YhECJMSdo54ZFH3d",
//            emails: Array[1],
//            services: Object
//        },
//        collaborators: [
//            {
//              _id: "x2jfSxPokHdQWd5Xf",
//                emails: Array[1],
//                services: Object
//            },
//            ...
//        ]
//      },
//      ...
// ]
```

## TODO ##

- [ ] Tests
- [x] Publish and join fields of children docs. Currently only collection fields are published and joined
- [ ] Allow to specify which fields of joined documents to publish
- [ ] Allow to specify the custom find method on schema and publication level
- [ ] Extra join methods (`findByField`)
- [ ] Think of better names
  - [x] Meteor.publishSchema -> Meteor.publishRelations || Meteor.publishAndJoin ??
  - [x] findById -> joinById ??
- [ ] Custom `children` properties in publication method (see `reywood:publish-composite`)
- [ ] Return "normal" cursor to have `count()` and `observe()` etc. (Low priority)

