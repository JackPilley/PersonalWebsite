#version 300 es
precision mediump float;

in vec4 vPosition;

layout(location=0) out vec4 FragColor;

void main() {
    FragColor = vec4(gl_FragCoord.zzz, 1.0);
}
