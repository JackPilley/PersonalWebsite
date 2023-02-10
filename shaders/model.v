#version 300 es
precision mediump float;

in vec3 aPosition;
in vec2 aTextureCoord;
in vec3 aNormal;

out vec3 vPosition;
out vec2 vTextureCoord;
out vec3 vNormal;

uniform mat4 uModelView;
uniform mat3 uNormal;
uniform mat4 uProjection;

void main()
{
    vPosition = (uModelView * vec4(aPosition, 1.0f)).xyz;
    vTextureCoord = aTextureCoord;
    vNormal = uNormal * aNormal;
    gl_Position = uProjection * uModelView * vec4(aPosition, 1.0f);
}