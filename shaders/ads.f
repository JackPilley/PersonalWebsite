#version 300 es
precision mediump float;

in vec2 vTextureCoord;

uniform sampler2D uDiffuseTexture;

layout(location = 0) out vec4 FragColor;

void main()
{
    FragColor = texture(uDiffuseTexture, vTextureCoord);
}