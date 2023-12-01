
# SelfieCam 

This was an experiment in using the depth information from the iPhone
camera to simulate a different lens focal length and perspective distance.
The idea was to simulate what it would be like to take a photo from farther away
with the same field of view (producing a "flatter" image), which would be useful 
for taking selfies.

The fragment shader considers two camera perspectives, with the second farther 
from the subject and with a compensating increase in focal length. 
It renders a point in the second perspective by calculating how far on the image plane it has moved from 
first perspective and fetching what was at the original coordinate.

We can choose a second focal length that preserves image size at a given depth.
Logically we should try to preserve the size at the subject distance, but in practice
we get a lot of tearing where there is not enough info. This is because as we get farther
from the subject we would be revealing more of the sides of the face, for which
we have no actual information.

This was just an experiment and today this would all be done better using 
a vision transformer neural network trained on pairs of photos.  But I'm leaving the source here 
as an example.

## Sample

![screengrab](media/selfie.gif)
