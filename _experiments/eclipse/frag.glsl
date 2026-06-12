#version 300 es
precision mediump float;

#define PI 3.14159265358979323846

in vec2 vPosition;
in vec2 vScreenPos;

uniform vec2 resolution;
uniform float time;

layout(location = 0) out vec4 FragColor;

// This exponent in a float gives numbers in the range of [1.0, 2.0)
#define EXPONENT 0x3F800000
// Mask of the mantissa of a float
#define MASK 0x007FFFFF

ivec3 hash(ivec3 h)
{
    int a = h.x ^ 0x0fe382ac;
    int b = h.y ^ 0x7862c765;
    int c = h.z ^ 0xe63cf826;

    a ^= a << 3;
    a += a >> 5;
    a ^= a << 7;
    a += a >> 11;
    a ^= a << 13;
    a += a >> 17;
    a ^= a << 5;

    // Sponge, sort of
    b ^= a;
    b += b >> 2;
    b ^= b << 4;
    b += b >> 6;
    b ^= b << 12;
    b += b >> 20;
    b ^= b << 13;
    b += b >> 5;
    b ^= b << 9;

    c ^= b;
    c += c >> 1;
    c ^= c << 3;
    c += c >> 8;
    c ^= c << 14;
    c += c >> 23;
    c ^= c << 11;
    c += c >> 6;
    c ^= c << 2;

    return ivec3(a,b,c);
}

float noise(vec3 seed)
{
    ivec3 h = hash(floatBitsToInt(seed));

    float result = intBitsToFloat((MASK & (h.x ^ h.y ^ h.z)) | EXPONENT);

    return result-1.0;
}

float circleSDF(vec2 o, vec2 p, float r) {
    return length(p - o) - r;
}

#define DISK_RADIUS 0.4

void main()
{
    float pixelSize = 1./resolution.y;
    float aspectRatio = resolution.x/resolution.y;
    vec2 aspectPos = vec2(vPosition.x * aspectRatio, vPosition.y);
    if(aspectRatio < 1.) aspectPos = vec2(vPosition.x, vPosition.y/aspectRatio);

    float cosTime = cos(time/2.);

    float wave = max(0., cos(aspectPos.x * PI - cosTime * 1.5));
    wave *= wave;

    vec3 col = vec3(0.15, 0.13, 0.12);

    float dist = circleSDF(
        (vec2(0, 0.25 - noise(vec3(floor(vScreenPos.x/2.), time, 0.))/ 2.) * wave / 2.)
        * (1. - abs(cosTime)),
        aspectPos, 0.);

    col = mix(vec3(0.95, 0.09, 0.15), col, smoothstep(0.42, 0.42 + pixelSize*2., dist));

    dist = circleSDF(vec2(cosTime/1.3, 0.), aspectPos, 0.);

    col = mix(vec3(1., 1., 1.), col, smoothstep(DISK_RADIUS, DISK_RADIUS + pixelSize*2., dist));

    vec2 dotOrigin = (fract(aspectPos * 5.) - 0.5) * 2.;
    vec2 dotIndex = floor((aspectPos * 5.));
    dist = (1. - smoothstep(0.1, 0.1 + pixelSize * 20., circleSDF(vec2(0), dotOrigin, 0.))); 
    dist *= smoothstep(0.1, 0.6, min(1., cos(time + dotIndex.y/5.) + 1.));
    dist *= 1. - (step(0.6, abs(aspectPos.y)));
    dist *= 1. - (step(0., aspectPos.x));
    
    dist += step(0.9, fract((aspectPos.y - aspectPos.x - time/20.) * pixelSize * 20000.))
        * (step(0.9, aspectPos.x))
        * (1. - (step(1., aspectPos.x)));

    dist += step(0.6, aspectPos.x)
        * (1. - step(0.61, aspectPos.x))
        * (1. - (step(0.2, fract(aspectPos.y*20. + time*1.5))));

    col = mix(col, vec3(1.) - step(vec3(0.99), col), dist);

    

    FragColor = vec4(col, 1.);
}
