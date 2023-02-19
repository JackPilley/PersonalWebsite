#version 300 es
precision mediump float;

in vec3 aPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

out vec4 vPosition;

void main() {
    vPosition = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0f);
}
