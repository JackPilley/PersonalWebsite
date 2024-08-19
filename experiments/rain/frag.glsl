#version 300 es
precision mediump float;

// This exponent in a float gives numbers in the range of [0.5, 1.0)
#define EXPONENT 0x3F000000
// Mask of the mantissa of a float
#define MASK 0x007FFFFF

#define REGION_SIZE 100.0
#define PI 3.1415926535897

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

// Hashes the seed and puts it into the mantissa of a float with an exponent that
// will give numbers in the range [0.5, 1.0) and then remaps to [0.0, 1.0). 
// Importantly, this doesn't use any trig functnions, branching, or casting (assuming
// floatBitsToInt and intBitsToFloat don't count as casts).
// We get 23 bits of precision; we could get 24 using the sign bit but I can't
// think of a way to do that without branching. We could probably get 32 bits if I
// better understood how floats work
float noise(vec3 seed)
{
    ivec3 h = hash(floatBitsToInt(seed));

    float result = intBitsToFloat((MASK & (h.x ^ h.y ^ h.z)) | EXPONENT);

    return (result-0.5)*2.;
}

float mapForRegion(vec2 region, vec2 pos)
{
    float timeOffset = -time + noise(vec3(region, 0.));
    float iter = floor(timeOffset);
    float iterFract = fract(timeOffset);

    float radius = (REGION_SIZE / 2.) * iterFract;
    
    vec2 origin = vec2(noise(vec3(region, iter)), noise(vec3(region, iter + 1.)))*REGION_SIZE;
    
    float dist = length(pos - region * REGION_SIZE - origin) + radius;
    float innerRadius = (35. + 13. * (1. - iterFract));
    float outerRadius = 50.;

    float val = 0.;

    if (dist < outerRadius && dist > innerRadius)
    {
        val = (dist - innerRadius) / (outerRadius - innerRadius);
        val *= 0.5 + cos(iterFract * PI * 2. + PI) / 2.;
    }
    return 1. - val;
}

void main()
{
    vec2 region = floor(vScreenPos/REGION_SIZE);

    float val = mapForRegion(region, vScreenPos);
    val = min(val, mapForRegion(region + vec2(1.,0.), vScreenPos));
    val = min(val, mapForRegion(region + vec2(-1.,0.), vScreenPos));
    val = min(val, mapForRegion(region + vec2(0.,1.), vScreenPos));
    val = min(val, mapForRegion(region + vec2(0.,-1.), vScreenPos));
    val = min(val, mapForRegion(region + vec2(1.,1.), vScreenPos));
    val = min(val, mapForRegion(region + vec2(-1.,1.), vScreenPos));
    val = min(val, mapForRegion(region + vec2(1.,-1.), vScreenPos));
    val = min(val, mapForRegion(region + vec2(-1.,-1.), vScreenPos));

    FragColor = vec4(vec3(val), 1.0);
}
