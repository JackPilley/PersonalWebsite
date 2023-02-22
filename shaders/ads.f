#version 300 es
precision mediump float;

in vec3 vPosition;
in vec2 vTextureCoord;
in mat3 vTBN;
in vec4 vLightRelativePosition;

uniform sampler2D uDiffuseTexture;
uniform sampler2D uSpecularTexture;
uniform sampler2D uNormalTexture;
uniform float uAmbientFactor;

uniform mat4 uViewMatrix;

uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform sampler2D uShadowMap;

layout(location = 0) out vec4 FragColor;

//https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
vec3 ACESFilm(vec3 x)
{
    float a = 2.51f;
    float b = 0.03f;
    float c = 2.43f;
    float d = 0.59f;
    float e = 0.14f;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), vec3(0.0), vec3(1.0));
}

float SampleShadowMap(vec2 point)
{
    if (point.x >= 1.0 || point.x <= 0.0 || point.y >= 1.0 || point.y <= 0.0)
    {
        return 1.0;
    }

    return texture(uShadowMap, point).r;
}

float ShadowDetermination(vec4 fragLightPos)
{
    vec3 projectedCoord = fragLightPos.xyz/fragLightPos.w;

    projectedCoord = projectedCoord/2.0 + 0.5;
    float currentDepth = projectedCoord.z + 0.01;

    if(currentDepth >= 1.0) return 0.0;

    float shadow = 0.0;

    vec2 texelSize = vec2(1.0) / vec2(textureSize(uShadowMap, 0));

    shadow += currentDepth > SampleShadowMap(projectedCoord.xy + vec2(-1.0,-1.0) * texelSize) ? 1.0 : 0.0;
    shadow += currentDepth > SampleShadowMap(projectedCoord.xy + vec2(0.0,-1.0) * texelSize)  ? 1.0 : 0.0;
    shadow += currentDepth > SampleShadowMap(projectedCoord.xy + vec2(1.0,-1.0) * texelSize)  ? 1.0 : 0.0;
    shadow += currentDepth > SampleShadowMap(projectedCoord.xy + vec2(-1.0,0.0) * texelSize)  ? 1.0 : 0.0;
    shadow += currentDepth > SampleShadowMap(projectedCoord.xy + vec2(0.0,0.0) * texelSize)   ? 1.0 : 0.0;
    shadow += currentDepth > SampleShadowMap(projectedCoord.xy + vec2(1.0,0.0) * texelSize)   ? 1.0 : 0.0;
    shadow += currentDepth > SampleShadowMap(projectedCoord.xy + vec2(-1.0,1.0) * texelSize)  ? 1.0 : 0.0;
    shadow += currentDepth > SampleShadowMap(projectedCoord.xy + vec2(0.0,1.0) * texelSize)   ? 1.0 : 0.0;
    shadow += currentDepth > SampleShadowMap(projectedCoord.xy + vec2(1.0,1.0) * texelSize)   ? 1.0 : 0.0;

    shadow /= 9.0;

    return shadow;
}

void main()
{
    vec3 sunDir = (uViewMatrix * vec4(uSunDirection, 0.0)).xyz;

    vec4 diffuseSample = texture(uDiffuseTexture, vTextureCoord);
    vec4 specularSample = texture(uSpecularTexture, vTextureCoord);
    vec4 normalSample = texture(uNormalTexture, vTextureCoord);

    vec3 normal = normalize(vTBN * (normalSample.xyz * 2.0 - 1.0));

    vec3 ambient = uAmbientFactor  * uSunColor;

    //Diffuse calculation
    float diffuseFactor = max(dot(sunDir, normal), 0.0);
    vec3 diffuse = diffuseFactor  * uSunColor;

    //Blinn-Phong specular calculation modulated by the specular texture's alpha channel
    vec3 cameraDir = normalize(-vPosition);
    vec3 halfwayVec = normalize(sunDir + cameraDir);
    float specular = 0.0;
    float specularDot = dot(normal, halfwayVec);
    if(specularDot > 0.0)
    {
        float gloss = exp2(specularSample.a*5.0 + 10.0);
        specular = pow(specularDot, gloss);
    }

    float shadow = 1.0 - ShadowDetermination(vLightRelativePosition);

    //Diffuse and ambient lighting are based on the diffuse texture, specular lighting is based on the
    //specular texture
    vec3 finalColor = (diffuse * shadow + ambient) * diffuseSample.xyz + specular * shadow * specularSample.xyz;

    //finalColor = ACESFilm(finalColor);

    //FragColor = vec4(pow(finalColor, vec3(1.0/2.2)), diffuseSample.a);
    FragColor = vec4(finalColor, diffuseSample.a);
}