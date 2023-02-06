#version 300 es
precision mediump float;

in vec2 vTextureCoord;

layout(location = 0) out vec4 FragColor;

void main()
{
    FragColor = vec4(vTextureCoord, 0.0, 1.0);
}