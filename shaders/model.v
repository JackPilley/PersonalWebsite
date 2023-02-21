#version 300 es
precision mediump float;

in vec3 aPosition;
in vec2 aTextureCoord;
in vec3 aNormal;
in vec3 aTangent;
in vec3 aBitanget;

out vec3 vPosition;
out vec2 vTextureCoord;
out mat3 vTBN;
out vec4 vLightRelativePosition;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat3 uNormalMatrix;
uniform mat4 uProjectionMatrix;

uniform mat4 uLightMatrix;

void main()
{
    vPosition = (uViewMatrix * uModelMatrix * vec4(aPosition, 1.0f)).xyz;
    vTextureCoord = aTextureCoord;
    vLightRelativePosition = uLightMatrix * uModelMatrix * vec4(aPosition, 1.0f);

    vec3 tangent = normalize(uNormalMatrix * aTangent);
    vec3 bitanget = normalize(uNormalMatrix * aBitanget);
    vec3 normal = normalize(uNormalMatrix * aNormal);
    vTBN = mat3(tangent, bitanget, normal);

    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0f);
}