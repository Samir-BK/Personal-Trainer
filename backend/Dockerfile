# ============================================================
# STAGE 1: BUILD THE SPRING BOOT APPLICATION
# ============================================================

# Use Maven with Java 21 to compile and package the backend.
# This stage contains the build tools, but they will not be
# included in the final production image.
FROM maven:3.9-eclipse-temurin-21 AS build

# Set the working directory inside the build container.
WORKDIR /app

# Copy the Maven project configuration first.
# Docker can reuse the dependency cache when source files change.
COPY pom.xml .

# Download Maven dependencies before copying the source code.
# This avoids downloading them again for every code change.
RUN mvn dependency:go-offline -B

# Copy the Spring Boot source code into the container.
COPY src ./src

# Compile the application and create the executable JAR.
# Tests are skipped during image creation because they should
# already run separately in local development and GitHub Actions.
RUN mvn clean package -DskipTests -B


# ============================================================
# STAGE 2: RUN THE SPRING BOOT APPLICATION
# ============================================================

# Use a smaller Java 21 runtime image.
# Maven and the Java compiler are not needed at runtime.
FROM eclipse-temurin:21-jre

# Set the working directory for the running application.
WORKDIR /app

# Copy only the packaged application from the build stage.
# This keeps the production image smaller.
COPY --from=build /app/target/*.jar app.jar

# Document the port used by the Spring Boot application.
# EXPOSE does not automatically publish the port externally.
EXPOSE 8080

# Start Spring Boot when the container launches.
# Database credentials will be supplied through environment
# variables rather than stored inside the Docker image.
ENTRYPOINT ["java", "-jar", "app.jar"]
