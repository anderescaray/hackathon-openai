# Pitch script (3 minutes)

Three blocks of one minute. The bullets are what you say. Lines in *italics* are stage directions.

## 0:00 – 1:00 · The problem

- You have been looking for a flat on Idealista for a month, every single day.
- At the start you were picky. Now you message every listing, including the ones you don't like.
- *Slide: the photo of the flat.* After a month of that, this is the one that answers. *(Joke about the photo.)*
- It is no better for the landlord. They publish a listing and get 100 messages. Nobody can read 100 messages, so they answer a few and ignore the rest.
- Some of them reply two months later, when you already have a home.
- People want flats and landlords want tenants. What fails is how they find each other: the matching.

## 1:00 – 2:00 · The demo

- *Play the video.*
- Over the video: you talk to an agent for five minutes. First you say what you offer, then what you are looking for. For each thing, the agent asks if it is a must, meaning you won't take a home without it.
- Landlords do the same interview about their home.
- Your feed only shows homes where each side meets the other's musts. You like one, the landlord likes you back, and you both see why you match.

## 2:00 – 3:00 · The catch

- I just told you we do matching. That was a lie.
- If we only order homes by how well they fit you, the same five flats come out first for everybody, and everyone gets the same feed.
- Those five landlords are back to 100 messages, and the other flats never get seen. We would have rebuilt Idealista with a nicer interface.
- So every home has a limit: we show it to 10 people at a time. When it is full, the next person gets their next best home.
- A place opens up again when one of those 10 passes on it.
- The landlord gets 10 people who fit, and every home gets seen by someone.
- Medical graduates have the same problem when they are placed in hospitals: they all want the same few. The method that solved it won the Nobel Prize in Economics in 2012.

## Closing line (pick one)

1. With the numbers: "Five minutes of talking replace 300 messages sent and 100 messages read."
2. Back to the photo. *Slide: the photo again.* "You shouldn't end up here because it was the only one that answered."
3. With the limit: "We can't build more homes. We can stop wasting the ones we have."

I would use option 2. It finishes the joke from the first minute, and a jury remembers a picture better than a number. If the joke doesn't land in rehearsal, use option 1.

## Before rehearsing

- The limit of 10 is not built. The design orders homes by fit and shows the top 5, and the repository has no matching code yet. Either Asier adds the limit, or the third minute says "the next thing we build" instead of "what we do".
- If Asier builds it, a simple version is enough: count how many people each home is being shown to, and leave out the full ones when building a feed.
- With 25 homes and 25 tenants, a limit of 10 never fills up. For the demo, the limit has to be 2 or 3 if you want to show a flat leaving a feed.
- In the simple version, the first 10 people who fit get the flat, not the 10 who fit best. The Nobel method (by Gale and Shapley) assigns everyone at once. Say "the same problem", not "the same algorithm".
- The number 10 and the hospital comparison are Claude's additions, not from the spec. Change them if you prefer.
- The spec says landlords get "90+ messages". "100 in five minutes" has no source. "100 messages" without the timeframe is close enough.
- The photo for the joke is not in the repository.
