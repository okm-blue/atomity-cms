FROM gradle:8.12-jdk21 AS build
WORKDIR /home/gradle/project
COPY --chown=gradle:gradle build.gradle settings.gradle ./
COPY --chown=gradle:gradle src ./src
USER gradle
RUN gradle --no-daemon bootJar

FROM gradle:8.12-jdk21 AS test
WORKDIR /home/gradle/project
COPY --chown=gradle:gradle build.gradle settings.gradle ./
COPY --chown=gradle:gradle src ./src
USER gradle
CMD ["gradle", "--no-daemon", "test"]

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /home/gradle/project/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
