#version 300 es
precision mediump float;

// This exponent in a float gives numbers in the range of [0.5, 1.0)
#define EXPONENT 0x3F000000
// Mask of the mantissa of a float
#define MASK 0x007FFFFF

in vec2 vPosition;
in vec2 vScreenPos;

uniform vec2 resolution;
uniform float time;

layout(location = 0) out vec4 FragColor;

// Let's be honest, this is probably slower than the fract(sin(x)) method,
// but I thought it was an interesting idea. Plus I wanted a noise function
// I came up with myself. Although this hash method is basically Paul Hsieh's
// ( http://www.azillionmonkeys.com/qed/hash.html ), and I'm sure others
// have thought of shoving random bits into the mantissa of a float, I came
// up with the idea on my own.
ivec2 hash(ivec2 h)
{
    int a = h.x ^ 0x0fe382ac;
    int b = h.y ^ 0x7862c765;

    a ^= a << 3;
    a += a >> 5;
    a ^= a << 7;
    a += a >> 11;
    a ^= a << 13;
    a += a >> 17;
    a ^= a << 5;

    // Sponge, sort of
    b ^= a;
    b += b << 2;
    b ^= b >> 4;
    b += b << 6;
    b ^= b >> 12;
    b += b << 20;
    b ^= b >> 13;
    b += b << 5;
    b ^= b >> 9;

    return ivec2(a,b);
}

// Hashes the seed and puts it into the mantissa of a float with an exponent that
// will give numbers in the range [0.5, 1.0) and then remaps to [0.0, 1.0). 
// Importantly, this doesn't use any trig functnions, branching, or casting (assuming
// floatBitsToInt and intBitsToFloat don't count as casts).
// We get 23 bits of precision; we could get 24 using the sign bit but I can't
// think of a way to do that without branching. We could probably get 32 bits if I
// better understood how floats work
float noise(vec2 seed)
{
    ivec2 h = hash(floatBitsToInt(seed));

    float result = intBitsToFloat((MASK & (h.x ^ h.y)) | EXPONENT);

    return (result-0.5)*2.;
}

void main()
{
    FragColor = vec4(vec3(noise(floor(vScreenPos/2.))), 1.0);
}
