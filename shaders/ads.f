#version 300 es
precision mediump float;

in vec3 vPosition;
in vec2 vTextureCoord;
in vec3 vNormal;

uniform sampler2D uDiffuseTexture;
uniform sampler2D uSpecularTexture;
uniform float uAmbientFactor;

uniform mat4 uViewMatrix;

uniform vec4 uSunDirection;
uniform vec3 uSunColor;

layout(location = 0) out vec4 FragColor;

void main()
{
    vec3 normal = normalize(vNormal);
    vec3 sunDir = (uViewMatrix * uSunDirection).xyz;

    vec4 diffuseSample = texture(uDiffuseTexture, vTextureCoord);
    vec4 specularSample = texture(uSpecularTexture, vTextureCoord);

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
        specular = pow(specularDot, specularSample.a * 100.0);
    }

    //Diffuse and ambient lighting are based on the diffuse texture, specular lighting is based on the
    //specular texture
    vec3 finalColor = (diffuse + ambient) * diffuseSample.xyz + specular * specularSample.xyz;

    FragColor = vec4(finalColor, diffuseSample.a);
}