'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mockServer = exports.MockList = exports.addMockFunctionsToSchema = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _type = require('graphql/type');

var _graphql = require('graphql');

var _nodeUuid = require('node-uuid');

var _nodeUuid2 = _interopRequireDefault(_nodeUuid);

var _schemaGenerator = require('./schemaGenerator');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// This function wraps addMockFunctionsToSchema for more convenience
function mockServer(schema) {
  var mocks = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
  var preserveResolvers = arguments.length <= 2 || arguments[2] === undefined ? false : arguments[2];

  var mySchema = schema;
  if (!(schema instanceof _type.GraphQLSchema)) {
    // TODO: provide useful error messages here if this fails
    mySchema = (0, _schemaGenerator.buildSchemaFromTypeDefinitions)(schema);
  }
  addMockFunctionsToSchema({ schema: mySchema, mocks: mocks, preserveResolvers: preserveResolvers });

  return { query: function query(_query, vars) {
      return (0, _graphql.graphql)(mySchema, _query, {}, {}, vars);
    } };
}

// TODO allow providing a seed such that lengths of list could be deterministic
// this could be done by using casual to get a random list length if the casual
// object is global.
function addMockFunctionsToSchema() {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var schema = _ref.schema;
  var _ref$mocks = _ref.mocks;
  var mocks = _ref$mocks === undefined ? {} : _ref$mocks;
  var _ref$preserveResolver = _ref.preserveResolvers;
  var preserveResolvers = _ref$preserveResolver === undefined ? false : _ref$preserveResolver;

  function isObject(thing) {
    return thing === Object(thing) && !Array.isArray(thing);
  }
  if (!schema) {
    // XXX should we check that schema is an instance of GraphQLSchema?
    throw new Error('Must provide schema to mock');
  }
  if (!isObject(mocks)) {
    throw new Error('mocks must be of type Object');
  }

  // use Map internally, because that API is nicer.
  var mockFunctionMap = new Map();
  Object.keys(mocks).forEach(function (typeName) {
    mockFunctionMap.set(typeName, mocks[typeName]);
  });

  mockFunctionMap.forEach(function (mockFunction, mockTypeName) {
    if (typeof mockFunction !== 'function') {
      throw new Error('mockFunctionMap[' + mockTypeName + '] must be a function');
    }
  });

  var defaultMockMap = new Map();
  defaultMockMap.set('Int', function () {
    return Math.round(Math.random() * 200) - 100;
  });
  defaultMockMap.set('Float', function () {
    return Math.random() * 200 - 100;
  });
  defaultMockMap.set('String', function () {
    return 'Hello World';
  });
  defaultMockMap.set('Boolean', function () {
    return Math.random() > 0.5;
  });
  defaultMockMap.set('ID', function () {
    return _nodeUuid2.default.v4();
  });

  function mergeObjects(a, b) {
    return Object.assign(a, b);
  }

  // returns a random element from that ary
  function getRandomElement(ary) {
    var sample = Math.floor(Math.random() * ary.length);
    return ary[sample];
  }

  // takes either an object or a (possibly nested) array
  // and completes the customMock object with any fields
  // defined on genericMock
  // only merges objects or arrays. Scalars are returned as is
  function mergeMocks(genericMockFunction, customMock) {
    if (Array.isArray(customMock)) {
      return customMock.map(function (el) {
        return mergeMocks(genericMockFunction, el);
      });
    }
    if (isObject(customMock)) {
      return mergeObjects(genericMockFunction(), customMock);
    }
    return customMock;
  }

  function assignResolveType(type) {
    var fieldType = (0, _type.getNullableType)(type);
    var namedFieldType = (0, _type.getNamedType)(fieldType);

    var oldResolveType = namedFieldType.resolveType;
    if (preserveResolvers && oldResolveType && oldResolveType.length) {
      return;
    }

    if (namedFieldType instanceof _type.GraphQLUnionType || namedFieldType instanceof _type.GraphQLInterfaceType) {
      // the default `resolveType` always returns null. We add a fallback
      // resolution that works with how unions and interface are mocked
      namedFieldType.resolveType = function (data, context, info) {
        return info.schema.getType(data.typename);
      };
    }
  }

  var mockType = function mockType(type, typeName, fieldName) {
    // order of precendence for mocking:
    // 1. if the object passed in already has fieldName, just use that
    // --> if it's a function, that becomes your resolver
    // --> if it's a value, the mock resolver will return that
    // 2. if the nullableType is a list, recurse
    // 2. if there's a mock defined for this typeName, that will be used
    // 3. if there's no mock defined, use the default mocks for this type
    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var root = args[0];
      var queryArgs = args[1];
      var context = args[2];
      var info = args[3];

      // nullability doesn't matter for the purpose of mocking.

      var fieldType = (0, _type.getNullableType)(type);
      var namedFieldType = (0, _type.getNamedType)(fieldType);

      if (root && typeof root[fieldName] !== 'undefined') {
        var result = void 0;
        // if we're here, the field is already defined
        if (typeof root[fieldName] === 'function') {
          result = root[fieldName].apply(root, args);
          if (result instanceof MockList) {
            var _result;

            result = (_result = result).mock.apply(_result, args.concat([fieldType, mockType]));
          }
        } else {
          result = root[fieldName];
        }

        // Now we merge the result with the default mock for this type.
        // This allows overriding defaults while writing very little code.
        if (mockFunctionMap.has(namedFieldType.name)) {
          var _mockFunctionMap$get;

          result = mergeMocks((_mockFunctionMap$get = mockFunctionMap.get(namedFieldType.name)).bind.apply(_mockFunctionMap$get, [null].concat(args)), result);
        }
        return result;
      }

      if (fieldType instanceof _type.GraphQLList) {
        return [mockType(fieldType.ofType).apply(undefined, args), mockType(fieldType.ofType).apply(undefined, args)];
      }
      if (mockFunctionMap.has(fieldType.name)) {
        // the object passed doesn't have this field, so we apply the default mock
        return mockFunctionMap.get(fieldType.name).apply(undefined, args);
      }
      if (fieldType instanceof _type.GraphQLObjectType) {
        // objects don't return actual data, we only need to mock scalars!
        return {};
      }
      // TODO mocking Interface and Union types will require determining the
      // resolve type before passing it on.
      // XXX we recommend a generic way for resolve type here, which is defining
      // typename on the object.
      if (fieldType instanceof _type.GraphQLUnionType) {
        var randomType = getRandomElement(fieldType.getTypes());
        return _extends({
          typename: randomType
        }, mockType(randomType).apply(undefined, args));
      }
      if (fieldType instanceof _type.GraphQLInterfaceType) {
        var possibleTypes = schema.getPossibleTypes(fieldType);
        var _randomType = getRandomElement(possibleTypes);
        return _extends({
          typename: _randomType
        }, mockType(_randomType).apply(undefined, args));
      }
      if (fieldType instanceof _type.GraphQLEnumType) {
        return getRandomElement(fieldType.getValues()).value;
      }
      if (defaultMockMap.has(fieldType.name)) {
        return defaultMockMap.get(fieldType.name).apply(undefined, args);
      }
      // if we get to here, we don't have a value, and we don't have a mock for this type,
      // we could return undefined, but that would be hard to debug, so we throw instead.
      throw new Error('No mock defined for type "' + fieldType.name + '"');
    };
  };

  (0, _schemaGenerator.forEachField)(schema, function (field, typeName, fieldName) {
    assignResolveType(field.type);

    // we have to handle the root mutation and root query types differently,
    // because no resolver is called at the root.
    var isOnQueryType = typeName === (schema.getQueryType() || {}).name;
    var isOnMutationType = typeName === (schema.getMutationType() || {}).name;
    if (isOnQueryType || isOnMutationType) {
      if (mockFunctionMap.has(typeName)) {
        var _ret = function () {
          var rootMock = mockFunctionMap.get(typeName);
          if (rootMock()[fieldName]) {
            // TODO: assert that it's a function
            // eslint-disable-next-line no-param-reassign
            field.resolve = function (root) {
              for (var _len2 = arguments.length, rest = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                rest[_key2 - 1] = arguments[_key2];
              }

              var updatedRoot = root || {}; // TODO: should we clone instead?
              updatedRoot[fieldName] = rootMock()[fieldName];
              // XXX this is a bit of a hack to still use mockType, which
              // lets you mock lists etc. as well
              // otherwise we could just set field.resolve to rootMock()[fieldName]
              // it's like pretending there was a resolve function that ran before
              // the root resolve function.
              return mockType(field.type, typeName, fieldName).apply(undefined, [updatedRoot].concat(rest));
            };
            return {
              v: void 0
            };
          }
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
      }
    }
    if (!preserveResolvers || !field.resolve) {
      // eslint-disable-next-line no-param-reassign
      field.resolve = mockType(field.type, typeName, fieldName);
    } else {
      (function () {
        var oldResolver = field.resolve;
        var mockResolver = mockType(field.type, typeName, fieldName);
        // eslint-disable-next-line no-param-reassign
        field.resolve = function () {
          var mockedValue = mockResolver.apply(undefined, arguments);
          var resolvedValue = oldResolver.apply(undefined, arguments);
          return (typeof mockedValue === 'undefined' ? 'undefined' : _typeof(mockedValue)) === 'object' && (typeof resolvedValue === 'undefined' ? 'undefined' : _typeof(resolvedValue)) === 'object' ? Object.assign({}, mockedValue, resolvedValue) : resolvedValue;
        };
      })();
    }
  });
}

var MockList = function () {
  // wrappedFunction can return another MockList or a value
  function MockList(len, wrappedFunction) {
    _classCallCheck(this, MockList);

    this.len = len;
    if (typeof wrappedFunction !== 'undefined') {
      if (typeof wrappedFunction !== 'function') {
        throw new Error('Second argument to MockList must be a function or undefined');
      }
      this.wrappedFunction = wrappedFunction;
    }
  }

  _createClass(MockList, [{
    key: 'mock',
    value: function mock(root, args, context, info, fieldType, mockTypeFunc) {
      function randint(low, high) {
        return Math.floor(Math.random() * (high - low + 1) + low);
      }
      var arr = void 0;
      if (Array.isArray(this.len)) {
        arr = new Array(randint(this.len[0], this.len[1]));
      } else {
        arr = new Array(this.len);
      }
      for (var i = 0; i < arr.length; i++) {
        if (typeof this.wrappedFunction === 'function') {
          var res = this.wrappedFunction(root, args, context, info);
          if (res instanceof MockList) {
            var nullableType = (0, _type.getNullableType)(fieldType.ofType);
            arr[i] = res.mock(root, args, context, info, nullableType, mockTypeFunc);
          } else {
            arr[i] = res;
          }
        } else {
          arr[i] = mockTypeFunc(fieldType.ofType)(root, args, context, info);
        }
      }
      return arr;
    }
  }]);

  return MockList;
}();

exports.addMockFunctionsToSchema = addMockFunctionsToSchema;
exports.MockList = MockList;
exports.mockServer = mockServer;