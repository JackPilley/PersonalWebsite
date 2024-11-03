#version 300 es
precision mediump float;

// This exponent in a float gives numbers in the range of [0.5, 1.0)
#define EXPONENT 0x3F000000
// Mask of the mantissa of a float
#define MASK 0x007FFFFF

#define SCALE_FACTOR 100.0
#define PI 3.1415926535897

in vec2 vPosition;
in vec2 vScreenPos;

uniform vec2 resolution;
uniform float time;

layout(location = 0) out vec4 FragColor;

// Hash method inspired by Paul Hsieh ( http://www.azillionmonkeys.com/qed/hash.html )
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
    c += c >> 2;
    c ^= c << 4;
    c += c >> 6;
    c ^= c << 12;
    c += c >> 20;
    c ^= c << 13;
    c += c >> 5;
    c ^= c << 9;

    return ivec3(a,b,c);
}

// Hash based noise generation
float noise(vec3 seed)
{
    ivec3 h = hash(floatBitsToInt(seed));

    float result = intBitsToFloat((MASK & (h.x ^ h.y ^ h.z)) | EXPONENT);

    return (result-0.5)*2.;
}

// I derived this function myself. It reflects the test point until we're just testing against
// a single vertical line segment. The sign of the x position tells us if we're inside the 
// hexagon of not.
float sdfHexagon(vec2 p, float r) 
{
    p /= r;
    p = abs(p);
    const vec2 axis = vec2(0.866025403, 0.5);
    vec2 reflected = -reflect(p, axis);
    p = vec2(max(p.x, reflected.x), min(p.y, reflected.y));
    return length(p - clamp(p, vec2(axis.x, -axis.y), axis)) * sign(p.x - axis.x) * r;
}

void main()
{
    vec2 scaledPos = vScreenPos / SCALE_FACTOR;
    // I just eyeballed these values
    const vec2 domain = vec2(1., 1.75);
    vec2 gridA = mod(scaledPos, domain) - vec2(0.5, 0.55);
    vec2 gridB = mod(scaledPos - domain/2., domain) - vec2(0.5, 0.55);

    float distA = sdfHexagon(gridA, 0.5);
    float distB = sdfHexagon(gridB, 0.5);

    vec3 background = vec3(0.);

    if(distA < distB)
    {
        vec3 shade = vec3(cos(distA * 100. + time*5.)/2. + .5);
        FragColor = vec4(mix(shade, background, smoothstep(-0.01, 0.01, distA)), 1.0);
    }
    else
    {
        vec3 shade = vec3(cos(distB * 100. - time*6.)/2. + .5);
        FragColor = vec4(mix(shade, background, smoothstep(-0.01, 0.01, distB)), 1.0);
    }

    float centreDist = sdfHexagon(vec2(vPosition.x, vPosition.y * resolution.y/resolution.x), .5);
    float offset = noise(vec3(floor((vScreenPos.x + cos(vPosition.y * 10.) * 12.)/2.)));
    float centreForeground = max(fract(vScreenPos.y/1000. - (time * (offset + 1.) / 4.)) - .7, 0.)/0.3;
    FragColor = vec4(mix(vec3(centreForeground), FragColor.rgb, smoothstep(-0.01, 0.01, centreDist)), 1.0);
}
