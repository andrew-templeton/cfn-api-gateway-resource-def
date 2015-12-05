
var AWS = require('aws-sdk');
var CfnLambda = require('cfn-lambda');

var MethodRequest = CfnLambda.Module('cfn-api-gateway-method');
var MethodResponse = CfnLambda.Module('cfn-api-gateway-method-response');
var IntegrationRequest = CfnLambda.Module('cfn-api-gateway-integration');
var IntegrationResponse = CfnLambda.Module('cfn-api-gateway-integration-response');

exports.handler = CfnLambda.Composite({
  AWS: AWS,
  PingInSeconds: 20,
  MaxPings: 20,
  SchemaPath: [__dirname, 'schema.json'],
  Composition: Composition
});

function Composition(Params, Composite, Done) {
  Params.Methods.forEach(function(methodConfig) {
    var methodRequestName = methodConfig.Method + 'MethodRequest';
    Composite.AddResource(MethodRequest, methodRequestName, {
      AuthorizationType: methodConfig.Request.AuthorizationType,
      RestApiId: Params.RestApiId,
      HttpMethod: methodConfig.Method,
      ResourceId: Params.ResourceId,
      ApiKeyRequired: methodConfig.Request.ApiKeyRequired,
      RequestModels: methodConfig.Request.Models,
      RequestParameters: inverseBoolHash(methodConfig.Request.Parameters)
    });
    var methodResponseNames = methodConfig.Responses.map(function(responseConfig) {
      var methodResponseName = methodConfig.Method +
        'MethodResponse' + coerceCode(responseConfig.StatusCode);
      Composite.AddResource(MethodResponse, methodResponseName, 
        {
          StatusCode: responseConfig.StatusCode,
          RestApiId: Params.RestApiId, 
          HttpMethod: methodConfig.Method,
          ResourceId: Params.ResourceId,
          ResponseModels: responseConfig.Models,
          ResponseParameters: boolHash(responseConfig.Parameters)
        }, [
          methodRequestName
        ]);
      return methodResponseName;
    });
    var integrationRequestName = methodConfig.Method + 'IntegrationRequest';
    Composite.AddResource(IntegrationRequest, integrationRequestName, {
      RestApiId: Params.RestApiId,
      ResourceId: Params.ResourceId,
      HttpMethod: methodConfig.Method,
      Type: methodConfig.Request.Type,
      IntegrationHttpMethod: methodConfig.Request.IntegrationHttpMethod,
      Uri: methodConfig.Request.Uri,
      Credentials: methodConfig.Request.Credentials,
      CacheNamespace: methodConfig.Request.CacheNamespace,
      CacheKeyParameters: methodConfig.Request.CacheKeyParameters,
      RequestTemplates: methodConfig.Request.Templates,
      RequestParameters: methodConfig.Request.Parameters
    }, methodResponseNames);
    methodConfig.Responses.forEach(function(responseConfig) {
      Composite.AddResource(IntegrationResponse, methodConfig.Method +
        'IntegrationResponse' + coerceCode(responseConfig.StatusCode), 
        {
          StatusCode: responseConfig.StatusCode,
          RestApiId: Params.RestApiId,
          HttpMethod: methodConfig.Method,
          ResourceId: Params.ResourceId,
          SelectionPattern: responseConfig.SelectionPattern,
          ResponseTemplates: responseConfig.Templates,
          ResponseParameters: responseConfig.Parameters
        }, [
        integrationRequestName
      ]);
    });
  });
  Done();
}

function coerceCode(code) {
  return code[0] === '2'
    ? '2XX'
    : code;
}

function inverseBoolHash(hash) {
  return hash && Object.keys(hash).reduce(function(boolified, key) {
    boolified[hash[key]] = true;
    return boolified;
  }, {});
}

function boolHash(hash) {
  return hash && Object.keys(hash).reduce(function(boolified, key) {
    boolified[key] = true;
    return boolified;
  }, {});
}
