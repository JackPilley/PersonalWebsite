#version 300 es
precision mediump float;

in vec2 vPosition;
in vec2 vScreenPos;

uniform vec2 resolution;
uniform float time;

layout(location = 0) out vec4 FragColor;

void main() {
    vec2 aspectPos = vec2(vPosition.x * (resolution.x/resolution.y), vPosition.y);
    
    float intensity = 0.0;
    for(float i = 1.0; i < 2.0; i = i + 0.2)
    {
        float line = aspectPos.y + 
            (1.1-vPosition.x*vPosition.x)*cos(time*i + aspectPos.x * 5.0/i + cos(i*time))/(3.0+i) +
            cos(time*i*2.0+aspectPos.x*8.0)/(8.0+i);
        line = abs(line);
        line = 0.02/line;

        intensity = max(line, intensity);
    }

    intensity = max(intensity, (1.0 - aspectPos.y * aspectPos.y)/5.0);
    
    FragColor = vec4(
        0.0,
        intensity/2.0,
        intensity,
        1.0);
}
