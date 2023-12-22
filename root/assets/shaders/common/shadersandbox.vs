#version 300 es
precision mediump float;

in vec2 aPosition;

out vec2 vPosition;
out vec2 vScreenPos;

uniform vec2 resolution;
uniform float time;

void main()
{
    vPosition = aPosition;
    vScreenPos = resolution * vPosition;

    gl_Position = vec4(vPosition, 0.0f, 1.0f);
}