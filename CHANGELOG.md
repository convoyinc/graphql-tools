# Changelog

### vNEXT

* Add `requireResolversForAllFields` resolver validation option ([@nevir](https://github.com/nevir) in PR)

### v0.6.4
* Make mocking partial objects match expected behavior ([@sebastienbarre](https://github.com/sebastienbarre) in [#96](https://github.com/apollostack/graphql-tools/pull/96))
* Improved behavior when mocking interfaces & unions ([@itajaja](https://github.com/itajaja) in [#102](https://github.com/apollostack/graphql-tools/pull/102))

### v0.6.3

* Unpin babel-core version to solve build problem (PR #92)
* Added support for `extend` keyword to schemaGenerator https://github.com/apollostack/graphql-tools/pull/90

### v0.6.2

* Fix a bug with addSchemaLevelResolveFunction. It now runs once per tick (PR #91)

### v0.5.2

* Add addSchemaLevelResolveFunction to exports
* Remove dist folder before prepublish to make sure files deleted in source are not included in build

### v0.5.1

* Updated GraphQL dependency to 0.6.0
* Removed all tracer code, including `Tracer`, `addTracingToResolvers` and `decorateWithTracer`
