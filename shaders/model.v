#version 300 es
precision mediump float;

in vec3 aPosition;
in vec2 aTextureCoord;

out vec2 vTextureCoord;

uniform mat4 uModelView;
uniform mat4 uProjection;

void main()
{
    vTextureCoord = aTextureCoord;
    gl_Position = uProjection * uModelView * vec4(aPosition, 1.0f);
}