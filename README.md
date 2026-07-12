# Scoutify
A tool that amateur football players can use to determine their skillset compared to a large database of NFL players.
Built using React/Next.js, Tailwind, etc. as well as a FastAPI backend.

Version history might look cursed but I promise we split up the work 😅

# About the Project (copied from Devpost)

## Inspiration

As we scrutinized the theme of sports, one common theme kept haunting us in the background: inequity. Despite the decades of institutional efforts to make sports as accessible as possible, it’s clear that some aspiring athletes don’t have the same budgets and networks that others do. That’s when we realized that we could spend the next 41 hours fighting this inequality, and we were inspired to make Scoutify.

## What it does

When a high school/amateur football player inputs their stats, their profile is normalized and checked against a database of NFL combined data to determine what advantages the profile has and show a roadmap of how exactly determined disadvantages could be worked on. Additionally, the app outputs profiles of other NFL drafts that have similar skill ratios, which act as successful references that were drafted with a similar build.

## How we built it

We designed our own backend API to calculate scores based on the user profile and database context, return them alongside comparisons using a Neighbors model, and generate a roadmap of how exactly the user can reach the ranks of comparable NFL players. Then, we built our frontend around fetching the backend data and dynamically rendering the varying datapoints and roadmap advice.

## Challenges we ran into

A big challenge that we ran into was the age gap between the target audience (high schoolers and amateurs) and professional NFL players. We overcame this by finding a way to normalize the input profile before calculating scores, which resulted in a more reasonable comparison between the input and database. Additionally, we struggled allocating our time between the responsibilities of both frontend and backend, but we were able to mitigate this through transparent communication and maintaining a set of tasks.

## Accomplishments that we're proud of

The main accomplishments we were proud of was cleaning out and building a model around a real database and connecting the model output code to our frontend through a proper FastAPI backend server for the first time. Also, we were proud of ourselves for sticking it out and completing our very first/second hackathon!

## What we learned

We learned a lot about time and product management, since the pressure to meet the deadline and create a coherent app forced us to master those skills instantly. We also got some experience in some rites of passage, such as connecting our first backend server and shipping out our first viable project. Overall, we got a lot of experience and knowledge from working on Scoutify.

## What's next for Scoutify

This app is more than just a weekend hackathon project to us. We genuinely see its potential to expand into something great and help so many football players grind their ways to a possible draft. The social good aspect of our project is something we have grown to be very passionate about, and we plan on spreading and increasing the user base for our tool!




Shoutout Wilhelm
